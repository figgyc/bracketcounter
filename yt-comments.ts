#!/usr/bin/env node
import { YoutubeAPI3 } from "./api"
import {config} from "./config"
import WebSocket from "ws";
import * as fs from "fs";
const api = new YoutubeAPI3(checkFinished, processEntry, setDone, setTotalComments)

let wss: WebSocket.Server | undefined = undefined

function heartbeat(this: any) {
  this.isAlive = true;
}

if (config.liveMode) {
    wss = new WebSocket.Server({ port: config.port });

    wss.on('connection', (ws) => {
        (ws as any).isAlive = true;
        ws.on('pong', heartbeat);
        ws.on('error', () => console.log('websocket error'));
        ws.on('message', data => {
            try {
                if (data.toString() == config.accessCode) {
                    ws.send(JSON.stringify(currentMessage));
                    (ws as any).authed = true;
                }
            } catch {}
        })
    });

}
// Broadcast to all.
function broadcast(data: string) {
    if (data == "{}") return // don't send empty data
    console.log(data)
    if (wss != undefined) {
        wss.clients.forEach(ws => {
            if ((ws as any).isAlive === false) return ws.terminate();
            (ws as any).isAlive = false;
            ws.ping(() => {});

            if (ws.readyState === WebSocket.OPEN && (ws as any).authed) {
                ws.send(data);
            }
        })
    }
};



function setTotalComments(ttotalComments: number) {
    totalComments = ttotalComments
}

function scrubKey(config: any): any {
    let out = Object.assign({}, config)
    out.key = undefined
    out.isAuthenticated = undefined
    out.clientId = undefined
    out.clientSecret = undefined
    return out
}


// these are changed by various things
let initVotes: { [contestant: string]: number } = {}; // vote count: {"A": 1, "B": 2, ...}
for (let contestant in config.contestants) {
    initVotes[contestant] = 0
}

let votes: { [contestant: string]: number } = Object.assign({}, initVotes); // vote count: {"A": 1, "B": 2, ...}
let entries: any[] = []; // complete data logging
let validVotes: number = 0; // votes for a-h and not random stuff.
let votingUsers: { [userid: string]: number} = {}; // array of channel ids who have already voted, prevent dupes
let comments: number = 0; // number of comments processed for progress tracking
let commentIds: { [commentId: string]: Date } = {}; // comment ids to prevent duplicate counting on the live update
let totalComments: number = 0; // total number of comments that should be counted according to yt api
let multiVoters: number = 0; // people who commented more than once
let probablyDone: boolean = false; // rough estimate if we are done or not. based on if there is a next page
let runningPostTask: boolean = false;
let finalVotes: { [contestant: string]: number } = {}; // for fancy display of votes at the end. only used for filtering atm
let currentMessage: any = {};
// static things
let modStatuses: string[] = ["published"]; //, "heldForReview", "likelySpam"]; only on your own videos with authentication, todo: add authentication?
if (config.isAuthenticated) {
    modStatuses.push("heldForReview");
    modStatuses.push("likelySpam");
}

// set on start 'config' things
let deadline: number = Date.now();
let updateDate: number = Date.now();

let refreshInterval: NodeJS.Timer | null = null;
let resetInterval: NodeJS.Timer | null = null;
let refreshN = 0;

// regex helper, get all [x] letters in a comment
function allMatches(str: string, checker: RegExp): Promise<Array<string>> {
    return new Promise<Array<string>>(resolve => {
        resolve(Array.from(str.toLowerCase().matchAll(checker)).map(x => x[1]))
    });
}

let doneStatuses: { [status: string]: boolean} = {}
modStatuses.forEach(ms => {
    doneStatuses[ms] = false
})
function setDone(modStatus: string, doneValue: boolean) {
    doneStatuses[modStatus] = doneValue
    probablyDone = (Object.values(doneStatuses).every(v => (v == true)))
}

// output results (used to only do when done, thus name)
async function checkFinished() {
    if (!runningPostTask && probablyDone) {
        runningPostTask = true;
        refreshInterval = setInterval(() => {
            if (!config.suspended) {
                if (probablyDone || refreshN >= 10) {
                    refreshN = 0
                    console.log("refresh")
                    api.paged = false
                    modStatuses.forEach(modStatus => {
                        api.loadComments(config.id, modStatus, undefined, true, true);
                    })
                } else {
                    refreshN ++
                    console.log("refresh incomplete, check for errors")
                }
            }
        }, config.refreshTime * 1000);
        resetInterval = setInterval(() => {
            save()
            if (probablyDone && !config.suspended) {
                reset()
                modStatuses.forEach(modStatus => {
                    api.loadComments(config.id, modStatus, undefined);
                })
            }
        }, config.longRefreshTime * 1000);
    }
    finalVotes = {};
    for (let letter in config.contestants) {
        finalVotes[letter] = votes[letter];
    }
    validVotes = 0;
    for (let letter in config.contestants) {
        validVotes += votes[letter]
    }

    updateDate = Date.now();

    if (probablyDone) {
        currentMessage = {
            status: {
                deadline: +deadline,
                id: config.id,
                comments: comments,
                totalComments: totalComments,
                runningPostTask: runningPostTask,
                validVotes: validVotes,
                multiVoters: multiVoters,
                updateDate: updateDate,
                clients: (wss != undefined) ? wss.clients.size: 0,
                done: probablyDone,
            },
            config: scrubKey(config),
            votes: finalVotes,
            total: validVotes
        }
    }
    //if (totalComments * 0.9 <= comments) probablyDone = true
    broadcast(JSON.stringify(currentMessage));
}

// process entries and totals up vote count and other stuff
async function processEntry(entry: any) {
    if (config.blacklist.includes(entry.userId)) return // data compliance
    entries.push(entry);
    if (!commentIds.hasOwnProperty(entry.id) || commentIds[entry.id] != entry.date) {
        comments++;
        if (+entry.date < +deadline || config.deadlineHours == 0) {
            allMatches(entry.content, config.re).then((matches: string[]) => {
                if (matches.length > 0) {
                    for (let match of matches) {
                        if (
                            config.maxMultiVoters == 0 || votingUsers[entry.userId] == undefined ||
                            votingUsers[entry.userId] < config.maxMultiVoters
                        ) {
                            if (votingUsers[entry.userId] == undefined) {
                                votingUsers[entry.userId] = 1;
                            } else {
                                votingUsers[entry.userId] ++;
                            }
                            if (!votes[match]) {
                                votes[match] = 0;
                            }
                            votes[match]++;
                        } else {
                            multiVoters++;
                        }
                    }
                }
            });
        }
        commentIds[entry.id] = entry.date;
    } else {
        // dupe comment found, probably done paging
        if (commentIds.hasOwnProperty(entry.id) && !entry.isReply) {
            api.paged = true
        }
    }
}

function handleSignal () {
    console.log("Caught interrupt signal");
    if (probablyDone) save();
    process.exit();
}

process.on('SIGINT', handleSignal);
process.on('SIGTERM', handleSignal);

function save() {
    let savestate = {
        commentIds: commentIds,
        multiVoters: multiVoters,
        votingUsers: votingUsers,
        votes: votes,
        runningPostTask: runningPostTask,
        deadline: deadline,
        id: config.id, // check last
        totalComments: totalComments,
        comments: comments,
        validVotes: validVotes,
        finalVotes: finalVotes,
        entries: entries
    }
    fs.writeFileSync(config.savestateFile, JSON.stringify(savestate));
}

function reset() {
    commentIds = {}
    multiVoters = 0
    votingUsers = {}
    votes = Object.assign({}, initVotes);
    commentIds = {}
    runningPostTask = false
    comments = 0
    validVotes = 0
    finalVotes = {}
    entries = []
    modStatuses.forEach(ms => {
        doneStatuses[ms] = false
    })
    probablyDone = false
    currentMessage.status.done = false
    if (refreshInterval) clearInterval(refreshInterval)
    if (resetInterval) clearInterval(resetInterval)
}

function go() {
    comments = 0;
    votingUsers = {};
    finalVotes = {};
    probablyDone = false;

    api.apiFast("videos", {
        part: "statistics,snippet",
        id: config.id
    }).then(resp => {
        let obj = resp.result;
        if (obj.error) {
            throw obj.error;
        }
        let dateDeadline: Date = new Date(
            Date.parse(obj.items[0].snippet.publishedAt)
        );
        dateDeadline.setHours(dateDeadline.getHours() + +config.deadlineHours);
        deadline = +dateDeadline;
        api.uploader = obj.items[0].snippet.channelId;
        totalComments = obj.items[0].statistics.commentCount;
        let now = new Date();
        now.setHours(now.getHours() + 1);
        console.log(dateDeadline, now)
        if (!config.suspended) {
            modStatuses.forEach(modStatus => {
                api.loadComments(config.id, modStatus);
            });
        }
    }, console.log);

}

if (fs.existsSync(config.savestateFile)) {
    console.log("Loading savestate")
    let savestate = JSON.parse(fs.readFileSync(config.savestateFile).toString())
    console.log("Loaded")
    if (savestate.id == config.id) {
        commentIds = savestate.commentIds
        multiVoters = savestate.multiVoters
        votingUsers = savestate.votingUsers
        votes = savestate.votes
        entries = savestate.entries
        runningPostTask = false
        deadline = savestate.deadline
        totalComments = savestate.totalComments
        comments = savestate.comments
        validVotes = savestate.validVotes
        probablyDone = true
        finalVotes = savestate.finalVotes
        checkFinished()
    } else {
        console.log("Wrong video")
        go()
    }
} else {
    go()
}
