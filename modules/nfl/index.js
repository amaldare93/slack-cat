'use strict';
const request = require('request');

const SCORE_URL = 'https://feeds.nfl.com/feeds-rs/scores.json';

class Game {
  constructor(date, homeTeam, homeScore, awayTeam, awayScore, time) {
    this.date = date;
    this.homeTeam = homeTeam;
    this.homeScore = homeScore;
    this.awayTeam = awayTeam;
    this.awayScore = awayScore;
    this.time = time;
  }
}

module.exports = class Stock extends BaseModule {
  async handle(data) {
    const scores = await this.getScores(data.user_text);
    this.postScores(data, scores);
  }

  postScores(data, scores) {
    if (scores.length === 0) {
      this.bot.postMessage(data.channel, "I couldn't find anything!");
      return;
    }

    const fields = [];

    const isShort = scores.length !== 1;
    scores.forEach(it => {
      fields.push({
        value: `*${it.homeTeam}* - ${it.homeScore}\n*${it.awayTeam}* - ${
          it.awayScore
        }\n${it.time}\n_${it.date}_\n${isShort ? '---------' : ''}`,
        short: isShort,
      });
    });

    this.bot.postRawMessage(data.channel, {
      icon_emoji: ':football:',
      username: 'FootballCat',
      attachments: [
        {
          color: '#0D47A1',
          title: `${isShort ? 'Current Scores:' : 'Current Score:'}`,
          fields: fields,
        },
      ],
    });
  }

  parseDate(key) {
    if (!key) {
      return;
    }

    const year = key.slice(0, 4);
    const month = key.slice(4, 6);
    const day = key.slice(6, 8);

    const date = new Date();
    date.day = day;
    date.month = month;
    date.year = year;

    return date;
  }

  async getScores(userText) {
    const scores = await this.getData();

    const games = [];    

    scores.gameScores.forEach(it => {
      const homeScore = it.score ? it.score.homeTeamScore.pointTotal : 0;
      const awayScore = it.score ? it.score.visitorTeamScore.pointTotal : 0;

      games.push(
        new Game(
          `${it.gameSchedule.gameDate} @ ${it.gameSchedule.gameTimeEastern}`,
          it.gameSchedule.homeTeam.abbr,
          homeScore,
          it.gameSchedule.visitorTeam.abbr,
          awayScore,
          this.resolvePhase(it.score)
        )
      );
    });

    if (userText) {
      return games.filter(it => {
        return (
          it.homeTeam === userText.toUpperCase() ||
          it.awayTeam === userText.toUpperCase()
        );
      });
    }

    return games;
  }

  resolvePhase(score) {
    if (!score) {
      return "TBD";
    }

    if (score.phase === 'FINAL') {
      return score.phase;
    }

    return `${score.phase} - ${score.time}`;
  }

  getData() {
    var options = {
      url: SCORE_URL,
    };

    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        if (error) {
          reject(error);
          console.error(error);
          return;
        }

        resolve(JSON.parse(body));
      });
    });
  }

  help() {
    return 'Usage: `?nfl team` should output the current/final score.';
  }
};
