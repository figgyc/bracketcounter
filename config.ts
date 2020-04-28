export namespace config {
    export const id: string = "oav0TXI6bqc";
    export const countMultiVoters: boolean = false;
    export const deadlineHours: number = 48; // only count comments up to this time after the video
    export const refreshTime: number = 240; // amount of seconds to wait between runs of the background task and page refresh
    export const re: RegExp = /\[(.)\]/g; // regex [X] where X can be any character used to count votes, apparently for some reason [a-hA-H4XxIi] does less results but should it?
    // this object moderates who is a real contestant.
    export const contestants: { [contestant: string]: [string, string] } = { // color, name
        a: ["Balloony", "#00bf83"],
        b: ["Bubble", "#c7eof7"],
        c: ["Gelatin", "#76e81c"],
        d: ["Leafy", "#5ee103"],
        e: ["Lollipop", "#cd78fb"],
        f: ["Ruby", "#c1061a"],
        g: ["Teardrop", "#4eb4eb"]
    }; // template object to ensure ordering is correct

    export const blacklist: string[] = [

    ] // list of user ids who do not want to be counted
}


/* COLOR LIST FOR ALL BFB CONTESTANTS
        ["8 Ball", "#000000"],
        ["Balloony", "#00bf83"],
        ["Barf Bag", "#e2c1ac"],
        ["Basketball", "#ffa23b"],
        ["Bell", "#d99b74"],
        ["Black Hole", "#000000"],
        ["Blocky", "#e43d3c"],
        ["Bomby", "#626262"],
        ["Book", "#22b90d"],
        ["Bottle", "#e0e7f4"],
        ["Bracelety", "#62ffff"],
        ["Bubble", "#c7eof7"],
        ["Cake", "#593e3a"],
        ["Clock", "#607aab"],
        ["Cloudy", "#959eb9"],
        ["Coiny", "#ec9f02"],
        ["David", "#ffffff"],
        ["Donut", "#f5e0b0"],
        ["Dora", "#ffffff"],
        ["Eggy", "#f1ebe6"],
        ["Eraser", "#e67e93"],
        ["Fanny", "#275bcd"],
        ["Firey Jr", "#fe9a00"],
        ["Firey", "#fdcc03"],
        ["Flower", "#ff9aff"],
        ["Foldy", "#84d4c2"],
        ["Four", "#327cd0"],
        ["Fries", "#dc3731"],
        ["Gaty", "#d2cde8"],
        ["Gelatin", "#76e81c"],
        ["Golf Ball", "#dcdcf6"],
        ["Grassy", "#55bb1b"],
        ["Ice Cube", "#d4daf7"],
        ["Leafy", "#5ee103"],
        ["Lightning", "#fcf379"],
        ["Liy", "#b3c6ed"],
        ["Lollipop", "#cd78fb"],
        ["Loser", "#fff3ae"],
        ["Marker", "#9763fb"],
        ["Match", "#db3a3a"],
        ["Naily", "#cdcdcd"],
        ["Needle", "#cccccc"],
        ["Nickel", "#9fa3a2"],
        ["Pen", "#469fff"],
        ["Pencil", "#ffa90e"],
        ["Pie", "#ecc697"],
        ["Pillow", "#f0edf1"],
        ["Pin", "#f20e0f"],
        ["Puffball", "#ffcbff"],
        ["Remote", "#333333"],
        ["Roboty", "#cd2021"],
        ["Rocky", "#999999"],
        ["Ruby", "#c1061a"],
        ["Saw", "#9a5e49"],
        ["Snowball", "#ebebeb"],
        ["Spongy", "#f3d600"],
        ["Stapy", "#fe3565"],
        ["TV", "#555555"],
        ["Taco", "#eee0b5"],
        ["Teardrop", "#4eb4eb"],
        ["Tennis Ball", "#ecff13"],
        ["Tree", "#01c545"],
        ["Winner", "#bfc5ff"],
        ["Woody", "#ebbc63"],
        ["X", "#fffd34"],
        ["Yellow Face", "#ffff00"],
        ---
        TPOT recos: see https://cdn.discordapp.com/attachments/397133769431318538/692816182205743104/unknown.png
    */