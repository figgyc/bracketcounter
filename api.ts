// google api stuff

import async from "async";
import https from "https";
import querystring from "querystring";
import { IncomingMessage } from "http";
import { AuthHelper } from "./auth";
import * as urlLib from "url";

export class YoutubeAPI3 {

    checkFinished: Function
    processEntry: Function
    setDone: Function
    setTotalComments: Function
    public paged: boolean = false
    public uploader: string = "" // used to not stop rescanning pinned comments since pins are not reported in youtube's api
    pageflag: boolean = false
    auth: AuthHelper

    async snooze(ms: number) { new Promise(resolve => setTimeout(resolve, ms)); }

    constructor(checkFinished: Function, processEntry: Function, setDone: Function, setTotalComments: Function) {
        this.checkFinished = checkFinished
        this.processEntry = processEntry
        this.setDone = setDone
        this.setTotalComments = setTotalComments
        this.auth = new AuthHelper(this)
    }

    // nice fetch alternative for node
    async getContent(url: string, params: any, post: boolean = false): Promise<string> {
        // return new pending promise
        return new Promise<string>((resolve, reject) => {
            // select http or https module, depending on reqested url
            let parsedUrl = new urlLib.URL((url + (post ? "" : "?" + querystring.stringify(params))))
            const request = https.request({
                path: parsedUrl.pathname + parsedUrl.search,
                host: parsedUrl.hostname,
                port: parsedUrl.port,
                method: post ? "POST" : "GET",
                headers: post ? {
                    'Content-Type': 'application/x-www-form-urlencoded'
                } : undefined
            }, (response: IncomingMessage) => {
                // temporary data holder
                const body: String[] = [];
                // on every content chunk, push it to the data array
                response.on("data", (chunk: String) => body.push(chunk));
                // we are done, resolve promise with those joined chunks
                response.on("end", () => {
                    // handle http errors
                    if (
                        response.statusCode &&
                        (response.statusCode < 200 || response.statusCode > 299)
                    ) {
                        reject(
                            new Error(
                                "Failed to load page, status code: "
                                + url + " "
                                + response.statusMessage + " "
                                + body.join("")
                            )
                        );
                    } else {
                        resolve(body.join(""))
                    }
                });
            });
            if (post) request.write(querystring.stringify(params))
            // handle connection errors of the request
            request.on("error", err => reject(err));
            request.end();
        });
    }

    // fast alternative to gapi request that is real async
    async apiFast(endpoint: string, parameters: { [key: string]: any }, n = 0): Promise<any> {
        Object.assign(parameters, await this.auth.authenticate());
        parameters.prettyPrint = false;
        let url: string = `https://www.googleapis.com/youtube/v3/${endpoint}`;
        let resp: string = ""
        try {
            resp = await this.getContent(url, parameters);
        } catch (e) {
            console.log(`Retrying (try ${n})`, e)
            n++
            if (n < 10) {
                return await this.apiFast(endpoint, parameters, n)
            } else {
                console.log("Too many retries, giving up");
                throw e
            }
        }
        const returnv = JSON.parse(resp);
        const final = {
            result: returnv,
            error: returnv.error
        };
        return final;
    }

    // paginate replies, dont run unless necessary since it eats quota
    async getReplies(id: string, pageToken?: string) {
        this.apiFast("comments", {
            part: "snippet",
            fields:
                "items(id,snippet(textDisplay,authorChannelId,updatedAt,publishedAt)),nextPageToken",
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
            }
            if (item.replies.comments.length < item.snippet.totalReplyCount) {
                if (!this.pageflag || (item.snippet.topLevelComment && item.snippet.topLevelComment.snippet.authorChannelId.value != this.uploader)) {
                    // This is to prevent any pinned comments from disrupting the automatic page limiter since they are always scanned (the API has no pinned comment API so we use channel owner as a guess)
                    this.getReplies(item.id) //uses too much api but hey
                }
            }
        }
        const snippet = item.snippet.topLevelComment
            ? item.snippet.topLevelComment.snippet
            : item.snippet;
        if (snippet.authorChannelId != undefined && snippet.authorChannelId.value == this.uploader) { item.isReply = true } // anti-pin
        const entry = {
            likes: snippet.likeCount ? snippet.likeCount : 0,
            content: snippet.textDisplay,
            id: item.id,
            isReply: item.isReply ? true : false,
            userId: snippet.authorChannelId ? snippet.authorChannelId.value : 0,
            userName: snippet.authorDisplayName
                ? snippet.authorDisplayName
                : "unknown",
            date: Date.parse(snippet.updatedAt),
            postDate: Date.parse(snippet.publishedAt),
            edited: (snippet.updatedAt == snippet.publishedAt ? false : true),
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
        console.log("Loading comments")
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
                async.each(obj.items, (item: object, callback: Function) => {
                    this.noteItem(item);
                    callback()
                }, () => {
                    if (obj.nextPageToken && paginate && (!pageflag || !this.paged)) {// recheck paged
                        this.loadComments(id, modStatus, obj.nextPageToken, paginate, pageflag);
                    } else {
                        this.setDone(modStatus, true);
                        console.log("Refresh done for " + modStatus + " comments");
                    }

                })
            }
            this.checkFinished();
        }, console.log);
    }



}
