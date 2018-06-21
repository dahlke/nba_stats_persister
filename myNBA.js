#!/usr/bin/env node

const myNBA = require("commander");
const util = require("util");
const NBA = require("nba");
const moment = require("moment");
const dbApi = require("./myNBA/dbApi");

const API_RATE_LIMIT_WAIT_MIN_MS = 1 * 1000;
const API_DATE_FMT = "MM/DD/YYYY";
const NBA_FOUNDED_DATE = "06/06/1946";
const NBA_SEASON_MONTHS = [1, 2, 3, 4, 5, 6, 9, 10, 11, 12];


function requestTeam (teamId)  {
    NBA.stats.teamInfoCommon({ TeamID: teamId }).then((response) => {
        const teamDetail = response.teamInfoCommon[0];
        dbApi.saveTeam(response);
        console.log(`${response.teamInfoCommon[0].teamName} saved.`);
    });
}

function requestPlayer (playerId)  {
    NBA.stats.playerInfo({ PlayerID: playerId }).then((response) => {
        dbApi.savePlayer(response);
        console.log(`${response.commonPlayerInfo[0].displayFirstLast} saved.`);
    });
}

function requestScoreboard (gameDate)  {
    NBA.stats.scoreboard({gameDate: gameDate}).then((response) => {
        let gameHeaders = response.gameHeader;
        let gameLineScores = response.lineScore;

        for (i in gameHeaders) {
            let gameHeader = gameHeaders[i];
            dbApi.saveGameHeader(gameHeader);
        }

        console.log(gameHeaders.length, gameLineScores.length);
        for (i in gameLineScores) {
            let gameLineScore = gameLineScores[i];
            dbApi.saveGameLineScore(gameLineScore);
        }
    });
}

function loopTeams(remainingTeams) {
    const team = remainingTeams.shift();

    if (!!team) {
        const teamId = team.teamId;

        if (true || !teamDetailExists) {
            setTimeout(() => {
                requestTeam(teamId);
                console.log(`${team.teamName} requested...`);
                if (remainingTeams.length != 0) {
                    console.log(`Estimated time remaining: ${(API_RATE_LIMIT_WAIT_MIN_MS * remainingTeams.length) / 1000}s ...`)
                    loopTeams(remainingTeams);
                }
            }, API_RATE_LIMIT_WAIT_MIN_MS);
        } else {
            console.log(`Team detail for ${team.teamName} already exists.`);
            loopTeams(remainingTeams);
        }
    }
}

function loopPlayers(remainingPlayers) {
    const player = remainingPlayers.shift();

    if (!!player) {
        const playerId = player.playerId;

        setTimeout(() => {
            requestPlayer(playerId);
            console.log(`${player.fullName} requested...`);
            if (remainingPlayers.length != 0) {
                console.log(`Estimated time remaining: ${(API_RATE_LIMIT_WAIT_MIN_MS * remainingPlayers.length) / 1000}s ...`)
                loopPlayers(remainingPlayers);
            }
        }, API_RATE_LIMIT_WAIT_MIN_MS);
    }
}

function loopScoreboards(dayMoment) {
    const fmtDay = dayMoment.format(API_DATE_FMT);
    const dateInSeason = NBA_SEASON_MONTHS.includes(parseInt(dayMoment.format('MM')));
    const year = dayMoment.format("YYYY");
    const month = dayMoment.format("MM");
    const day = dayMoment.format("DD");
    const dayBefore = dayMoment.subtract(1, 'days');
    // TODO: more logging

    if (dateInSeason && fmtDay != NBA_FOUNDED_DATE) {
        if (fmtDay != NBA_FOUNDED_DATE) {
            setTimeout(() => {
                requestScoreboard(fmtDay);
                console.log(`Scoreboards for ${fmtDay} requested...`);
                loopScoreboards(dayBefore);
                // TODO: print saved
            }, API_RATE_LIMIT_WAIT_MIN_MS);
        }
    } else if (fmtDay != NBA_FOUNDED_DATE) {
        console.log(`${fmtDay} is not a season date.`);
        loopScoreboards(dayBefore);
    }
}

myNBA
  .version('0.1.0')
  .option('-t, --teams', 'Request team detail from NBA API')
  .option('-p, --players', 'Request player detail from NBA API')
  .option('-s, --scores', 'Request score detail from NBA API')
  .parse(process.argv);

if (myNBA.teams) {
    console.log(`Requesting all uncollected NBA team data.`);
    const allTeams = NBA.teams.slice(0);
    loopTeams(allTeams);
}

if (myNBA.players) {
    console.log(`Requesting all uncollected NBA player data.`);
    const allPlayers = NBA.players.slice(0);
    loopPlayers(allPlayers);
}

if (myNBA.scores) {
    console.log(`Requesting all uncollected NBA score data.`);
    let start = moment();
    loopScoreboards(start);
}

