// @ts-ignore
import { config } from "/client/config.js"
let initialized = false;

google.charts.load('current', {
    'packages': ['corechart']
});
google.charts.setOnLoadCallback(privacyHandler);
const privacyElement: HTMLDivElement = <HTMLDivElement> document.querySelector("#privacypolicy")!

function privacyHandler() {
    if (localStorage.getItem("privacyVersion") == "1") {
        privacyElement.style.display = "none"
        init()
    } else {
        privacyElement.style.display = "block"
    }
}

function privacyAccept() {
    localStorage.setItem("privacyVersion", "1");
    privacyElement.style.display = "none"
    init()
}
document.querySelector("#accept")?.addEventListener("click", privacyAccept)

function numberWithCommas(x: number) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function init() {
    if (initialized) return
    initialized = true // dont run twice
    const statusElement: HTMLDivElement = <HTMLDivElement> document.querySelector("#status")!;
    const postableElement: HTMLTextAreaElement = <HTMLTextAreaElement> document.querySelector("#postable")!;
    const wikiaElement: HTMLDivElement = <HTMLDivElement> document.querySelector("#wikiapostable")!;
    const chart = new google.visualization.BarChart(document.getElementById('graph')!);


    // Create WebSocket connection.
    let socket: WebSocket | null = null;
    try {
    socket = new WebSocket('wss://'+ window.location.hostname +'/socket');
    } catch(e) {
        console.log(event)
        statusElement.textContent = "Bracketcounter is currently unavaliable. This is probably because the voting period for the last video is done. Please come back when a new video is released!"
        statusElement.style.color = "yellow"
    }

    let translations: { [contestant: string]: string } = {};
    let colors: { [contestant: string]: string } = {};

    for (const contestant in config.contestants) {
        translations[contestant] = "[" + contestant.toUpperCase() + "] " + config.contestants[contestant][0]
        colors[contestant] = config.contestants[contestant][1]
    }

    socket!.addEventListener('error', function(event) {
        console.log(event)
        statusElement.textContent = "Bracketcounter is currently unavaliable. This is probably because the voting period for the last video is done. Please come back when a new video is released!"
        statusElement.style.color = "yellow"
    })

    // Listen for messages
    socket!.addEventListener('message', function(event) {
        let ob = JSON.parse(event.data);
        let status = ob.status;
        // document.body.style.background = `linear-gradient(rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.8) 100%), url(https://i.ytimg.com/vi/${status.id}/maxresdefault.jpg)`;
        let discordPostable = '**Unconfirmed** results:\nRemember it is **vote to save** so the character with the **least** votes is eliminated!\n```css\n';
        let wikiaPostable = `{| class="article-table mw-collapsible mw-collapsed" data-expandtext="Show votes" data-collapsetext="Hide votes"
!Icon
!Contestant
!Votes
!Percentage of votes`;
        let table = [
            ['Contestant', 'Votes', {
                role: 'style'
            }, {
                type: 'string',
                role: 'annotation'
            }]
        ];
        let sortedKeys = Object.keys(ob.votes).sort(function(a, b) {
            return ob.votes[b] - ob.votes[a]
        });
        for (const letter of sortedKeys) {
            let percent = (ob.votes[letter] / ob.total * 100).toFixed(10);
            let text = translations[letter] + ": " + ob.votes[letter] + " (" + percent.substring(0,4) + "%)";
            table.push([translations[letter], ob.votes[letter], colors[letter], text]);
            discordPostable += translations[letter] + ' '.repeat(18 - translations[letter].length) + ob.votes[letter] + ' '.repeat(6 - ob.votes[letter].toString().length) + '[' + percent.substring(0,4) + '%]\n';
            let isGreen = (letter == sortedKeys[0])
            let isRed = (letter == sortedKeys[sortedKeys.length-1])
            let colorPrefix = isGreen ? "{{Color|green|" : (isRed ? "{{Color|red|" : "")
            let colorSuffix = (isGreen || isRed) ? "}}" : ""
            let percent2 = (ob.votes[letter] / ob.total * 100).toFixed(1);
            wikiaPostable += `
|-
|{{TeamIconSpoiler|${config.contestants[letter][0].replace(' ', '')}}}
|{{Spoilerdiv|[[${config.contestants[letter][0]}]]}}
|${colorPrefix}${numberWithCommas(ob.votes[letter])}${colorSuffix}
|${colorPrefix}${percent2}%${colorSuffix}`;
        
        }
        let data = google.visualization.arrayToDataTable(table);
        let updateDate = new Date(status.updateDate);
        wikiaPostable += '\n|}';
        let minutesLeft = ((status.deadline - +(updateDate)) / 60000);
        let hoursLeft = Math.floor(minutesLeft / 60);
        let onlyMinsLeft = Math.floor(minutesLeft % 60);
        let secsLeft = Math.floor(((minutesLeft % 60) * 60) % 60);
        let statusString = `${status.done ? "" : "🕒RECOUNT IN PROGRESS, PLEASE WAIT🕒"} Video ID: ${status.id} Comments read: ${status.comments} (${(status.comments / status.totalComments * 100).toFixed(1)}%) Votes: ${status.validVotes} Last update: ${updateDate.toLocaleTimeString()} (${hoursLeft}h ${onlyMinsLeft}m ${secsLeft}s left)`;
        statusElement.innerText = statusString;
        discordPostable += `/************************/
Comments            ${status.comments}
Votes               ${status.validVotes}
Multi Voters        ${status.multiVoters}
/************************/
Avg Votes Per Char  ${status.validVotes / sortedKeys.length}
#1st-#2nd Margin    ${ob.votes[sortedKeys[0]] - ob.votes[sortedKeys[1]]} [${(ob.votes[sortedKeys[1]] / ob.votes[sortedKeys[0]] * 100).toFixed(1)}%]
#${sortedKeys.length-1}th-#${sortedKeys.length}th Margin    ${ob.votes[sortedKeys[sortedKeys.length-2]] - ob.votes[sortedKeys[sortedKeys.length-1]]} [${(ob.votes[sortedKeys[sortedKeys.length-1]] / ob.votes[sortedKeys[sortedKeys.length-2]] * 100).toFixed(1)}%]
#1st-#${sortedKeys.length}th Margin    ${ob.votes[sortedKeys[0]] - ob.votes[sortedKeys[sortedKeys.length-1]]} [${(ob.votes[sortedKeys[sortedKeys.length-1]] / ob.votes[sortedKeys[0]] * 100).toFixed(1)}%]
\`\`\``;
        postableElement.textContent = discordPostable;
        wikiaElement.textContent = wikiaPostable;
        chart.draw(data, {
            //height: 400,
            backgroundColor: 'transparent',
            legend: {
                position: 'none'
            },
            axisTitlesPosition: 'none',
            // accurate bar widths
            hAxis: {
                viewWindow: {
                    max: status.validVotes / 4,
                    min: 0
                },
                textPosition: 'in',
                gridlines: ({
                    minSpacing: 2763
                } as any)
            },
            vAxis: {
                textPosition: 'none'
            },
            bar: {
                groupWidth: '100%'
            },
            chartArea: {
                left: 0,
                top: 0,
                width: '100%',
                height: '100%'
            },
            fontName: 'Roboto'
        });
    });
}
