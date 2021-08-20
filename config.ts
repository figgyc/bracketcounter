import * as toml from "toml";
import * as fs from "fs";

let configFilename = "config.toml";
if (process.argv.length > 2) {
    configFilename = process.argv[2];
}

let confObj = toml.parse(fs.readFileSync(configFilename, {encoding: "utf-8"}));
export namespace config {
    export const key: string = confObj.key;
    export const id: string = confObj.id;
    export const savestateFile: string = confObj.savestateFile;
    export const accessCode: string = confObj.accessCode;
    export const suspended: boolean = confObj.suspended;
    export const isAuthenticated: boolean = confObj.isAuthenticated;
    export const clientId: string = confObj.clientId;
    export const clientSecret: string = confObj.clientSecret;
    export const authCache: string = confObj.authCache;
    export const liveMode: boolean = confObj.liveMode; // disable websockets systems
    export const port: number = confObj.port; // port for ws service
    export const maxMultiVoters: number = confObj.maxMultiVoters; // the maximum number of votes per person (use 0 for unlimited)
    export const deadlineHours: number = confObj.deadlineHours; // only count comments up to this time after the video
    export const refreshTime: number = confObj.refreshTime; // amount of seconds to wait between runs of the background task and page refresh
    export const longRefreshTime: number = confObj.longRefreshTime; // amount of seconds to wait between runs of the background task and page refresh
    export const re: RegExp = new RegExp(confObj.re, 'g'); // regex [X] where X can be any character used to count votes, apparently for some reason [a-hA-H4XxIi] does less results but should it?
    // this object moderates who is a real contestant.
    export const contestants: { [contestant: string]: [string, string] } = confObj.contestants; // template object to ensure ordering is correct

    export const blacklist: string[] = confObj.blacklist; // list of user ids who do not want to be counted
}


/* COLOR LIST FOR ALL BFB CONTESTANTS (new set)
        ["8 Ball", "#909bb7"],
        ["Balloony", "#02be81"],
        ["Barf Bag", "#dac48a"],
        ["Basketball", "#ff8329"],
        ["Bell", "#e08f62"],
        ["Black Hole", "#06041c"],
        ["Blocky", "#f42628"],
        ["Bomby", "#787ba4"],
        ["Book", "#00dd52"],
        ["Bottle", "#8dd1ba"],
        ["Bracelety", "#5ee1fd"],
        ["Bubble", "#86edfe"],
        ["Cake", "#9c6058"],
        ["Clock", "#6899db"],
        ["Cloudy", "#bfd3ec"],
        ["Coiny", "#ffa944"],
        ["David", "#d6ebec"],
        ["Donut", "#f4ae70"],
        ["Dora", "#ae7562"],
        ["Eggy", "#ffef54"],
        ["Eraser", "#f96887"],
        ["Fanny", "#326bf6"],
        ["Firey", "#ffa901"],
        ["Firey Jr", "#ffd62e"],
        ["Flower", "#ff72ff"],
        ["Foldy", "#5acbd3"],
        ["Four", "#327cd0"],
        ["Fries", "#f38749"],
        ["Gaty", "#bac6ff"],
        ["Gelatin", "#12d70d"],
        ["Golf Ball", "#bac2cf"],
        ["Grassy", "#4ae600"],
        ["Ice Cube", "#c2d4f8"],
        ["Leafy", "#70f31c"],
        ["Lightning", "#e8eb14"],
        ["Liy", "#a1aaf7"],
        ["Lollipop", "#b669f3"],
        ["Loser", "#ffe286"],
        ["Marker", "#9451ff"],
        ["Match", "#ff9d3c"],
        ["Naily", "#c4bbcc"],
        ["Needle", "#bdcccf"],
        ["Nickel", "#85aeb4"],
        ["Pen", "#1d87fd"],
        ["Pencil", "#ffb20a"],
        ["Pie", "#f7b578"],
        ["Pillow", "#e6bef2"],
        ["Pin", "#ff6759"],
        ["Puffball", "#ffd1ff"],
        ["Remote", "#4c3c3d"],
        ["Robot Flower", "#fe8cfe"],
        ["Roboty", "#22e16d"],
        ["Rocky", "#818d81"],
        ["Ruby", "#fd1850"],
        ["Saw", "#fe769c"],
        ["Snowball", "#c1c2f2"],
        ["Spongy", "#fdf02f"],
        ["Stapy", "#ff3778"],
        ["Taco", "#f9d599"],
        ["Teardrop", "#1fbce9"],
        ["Tennis Ball", "#b7e834"],
        ["Tree", "#11c852"],
        ["TV", "#33384b"],
        ["Winner", "#bfc5ff"],
        ["Woody", "#f3a656"],
        ["X", "#fffd34"],
        ["Yellow Face", "#fed102"],
        ---
        TPOT recos: see https://cdn.discordapp.com/attachments/397133769431318538/692816182205743104/unknown.png
    */
