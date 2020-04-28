// google api stuff

import { key } from "./key"
import async from "async";
import https from "https";
import { IncomingMessage } from "http";

export class YoutubeAPI3 {

    checkFinished: Function
    processEntry: Function
    setDone: Function
    public paged: boolean = false
    public uploader: string = "" // used to not stop rescanning pinned comments since pins are not reported in youtube's api
    pageflag: boolean = false

    async snooze(ms: number) { new Promise(resolve => setTimeout(resolve, ms)); }

    constructor(checkFinished: Function, processEntry: Function, setDone: Function) {
        this.checkFinished = checkFinished
        this.processEntry = processEntry
        this.setDone = setDone
    }

    // helper function for below to be easier to use, encodes objects to query strings
    jsonToQueryString(json: { [key: string]: any }) {
        return (
            "?" +
            Object.keys(json)
                .map(function (key: string) {
                    if (json[key] != null) {
                        return (
                            encodeURIComponent(key) +
                            "=" +
                            encodeURIComponent(json[key])
                        );
                    }
                })
                .join("&")
        );
    }

    // nice fetch alternative for node
    async getContent(url: string): Promise<string> {
        // return new pending promise
        return new Promise<string>((resolve, reject) => {
            // select http or https module, depending on reqested url
            const request = https.get(url, (response: IncomingMessage) => {
                // handle http errors
                if (
                    response.statusCode &&
                    (response.statusCode < 200 || response.statusCode > 299)
                ) {
                    if (response.statusCode == 403) {
                        console.log("403, quota out?");
                    }
                    reject(
                        new Error(
                            "Failed to load page, status code: "
                            + url
                            + response.statusMessage
                            // + util.inspect(response)
                        )
                    );
                }
                // temporary data holder
                const body: String[] = [];
                // on every content chunk, push it to the data array
                response.on("data", (chunk: String) => body.push(chunk));
                // we are done, resolve promise with those joined chunks
                response.on("end", () => { resolve(body.join("")) });
            });
            // handle connection errors of the request
            request.on("error", err => reject(err));
        });
    }

    // fast alternative to gapi request that is real async
    async apiFast(endpoint: string, parameters: { [key: string]: any }) {
        parameters.key = key;
        parameters.prettyPrint = false;
        let url: string = `https://www.googleapis.com/youtube/v3/${endpoint}${this.jsonToQueryString(
            parameters
        )}`;
        //console.log(url)
        const resp: string = await this.getContent(url);
        //console.log(resp)
        const returnv = JSON.parse(resp);
        const final = {
            result: returnv,
            error: returnv.error
        };
        //console.log(final, returnv);
        return final;
    }

    // paginate replies, dont run unless necessary since it eats quota
    async getReplies(id: string, pageToken?: string) {
        //    gapi.client.youtube.comments.list({part: 'snippet', parentId: id, textFormat: 'plainText', maxResults: 100, pageToken: pageToken}).then(resp => {
        this.apiFast("comments", {
            part: "snippet",
            fields:
                "items(id,snippet(textDisplay,authorChannelId,updatedAt)),nextPageToken",
            parentId: id,
            textFormat: "plainText",
            maxResults: 100,
            pageToken: pageToken
        }).then(resp => {
            let obj = resp.result;
            if (obj.nextPageToken) {
                this.getReplies(id, obj.nextPageToken);
            }
            if (obj.items) {
                async.each(obj.items, (item: any) => {
                    item.isReply = true
                    this.noteItem(item);
                });
            }

            this.checkFinished();
        }, console.log);
    }

    // parse api comments into simpler entries and process them
    async noteItem(item: any) {
        if (item.replies != undefined) {
            for (let reply of item.replies.comments) {
                reply.isReply = true;
                // console.log("REPLY", reply)
                this.noteItem(reply)
            }
            if (item.replies.comments.length < item.snippet.totalReplyCount) {
                console.log(item, item.snippet.topLevelComment.snippet.authorChannelId)
                if (!this.pageflag || (item.snippet.topLevelComment && item.snippet.topLevelComment.snippet.authorChannelId.value != this.uploader)) { // This is to prevent any JNJ pinned comments from disrupting the automatic page limiter since they are always scanned
                    console.log("getting extra replies", item.replies.comments.length, item.snippet.totalReplyCount);
                    this.getReplies(item.id) //uses too much api but hey
                }
            }
        }
        if (item.snippet == undefined) console.log("no snippet", item)
        const snippet = item.snippet.topLevelComment
            ? item.snippet.topLevelComment.snippet
            : item.snippet;
        if (snippet.authorChannelId != undefined && snippet.authorChannelId.value == this.uploader) { item.isReply = true } // This is to prevent any JNJ pinned comments from disrupting the automatic page limiter since they are always scanned
        const entry = {
            content: snippet.textDisplay,
            id: item.id,
            isReply: item.isReply ? true : false,
            userId: snippet.authorChannelId ? snippet.authorChannelId.value : 0,
            userName: snippet.authorDisplayName
                ? snippet.authorDisplayName
                : "unknown",
            date: Date.parse(snippet.updatedAt)
        };
        this.processEntry(entry);
    }

    // load comments of a certain modStatus
    async loadComments(
        id: string,
        modStatus: string,
        pageToken?: string,
        paginate: boolean = true,
        pageflag: boolean = false
    ) {
        this.pageflag = pageflag
        //    gapi.client.youtube.commentThreads.list({part: 'snippet', videoId: id, moderationStatus: modStatus, textFormat: 'plainText', order: 'time', maxResults: 100, pageToken: pageToken}).then(resp => {
        this.apiFast("commentThreads", {
            part: "snippet,replies",
            fields:
                "items(id,snippet(topLevelComment,totalReplyCount),replies),nextPageToken",
            videoId: id,
            moderationStatus: modStatus,
            textFormat: "plainText",
            order: "time",
            maxResults: 100,
            pageToken: pageToken
        }).then(resp => {
            let obj = resp.result;
            if (obj.error) {
                throw "Error requesting";
            } else {
                if (obj.nextPageToken && paginate && (!pageflag || !this.paged)) {
                    this.snooze(1000).then(() => {
                        if (obj.nextPageToken && paginate && (!pageflag || !this.paged)) // recheck paged
                            this.loadComments(id, modStatus, obj.nextPageToken);
                    })
                } else {
                    this.setDone();
                    console.log("refresh done");
                }
                async.each(obj.items, (item: object) => {
                    this.noteItem(item);
                });
            }
            this.checkFinished();
        }, console.log);
    }



}
