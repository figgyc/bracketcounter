// Google API key and OAuth2 handling.

import { config } from "./config"
// const key = config.key
import * as http from "http"
import { YoutubeAPI3 } from "./api"
import open from "open"
import * as crypto from "crypto"
import base64url from "base64url"
import * as fs from "fs"
import * as url from "url"
import querystring from "querystring"
import {
  createHttpTerminator,
} from 'http-terminator';

interface AuthCache {
    accessToken: string
    tokenExpiry: number
    refreshToken: string
}

export class AuthHelper {

    api: YoutubeAPI3
    isAuthing: boolean
    constructor(api: YoutubeAPI3) {
        this.api = api
        this.isAuthing = false
    }
    
    async authenticate(): Promise<any> {
        return new Promise<string>(async (resolve, _) => {
            while (this.isAuthing) { await this.api.snooze(1000) }

            let authData: any = {}
            if (config.isAuthenticated) {
                // OAuth2 flow
                // read auth cache
                let authCache: AuthCache = {
                    accessToken: "",
                    tokenExpiry: 0,
                    refreshToken: ""
                }
                if (fs.existsSync(config.authCache)) {
                    authCache = JSON.parse(fs.readFileSync(config.authCache, {encoding: "utf-8"}))
                }
                if (authCache.refreshToken == "") {
                    // no refresh token = no auth = we must login
                    let code_verifier = base64url.encode(crypto.randomBytes(96))
                    let code_challenge = base64url.encode(crypto.createHash("sha256").update(code_verifier).digest())
                    let port = 9567
                    let parameters = {
                        client_id: config.clientId,
                        redirect_uri: "http://127.0.0.1:" + port,
                        code_challenge: code_challenge,
                        code_challenge_method: "S256",
                        scope: "https://www.googleapis.com/auth/youtube.force-ssl",
                        response_type: "code"
                    }
                    let authRequestUrl = `https://accounts.google.com/o/oauth2/v2/auth?${querystring.stringify(parameters)}`
                    console.log("Open " + authRequestUrl + " in your browser if it has not already.");
                    await open(authRequestUrl)
                    let authCode = ""
                    let server = http.createServer(async (req, res) => {
                        let aUrl = new url.URL(req.url!, `http://${req.headers.host}`)
                        let query = querystring.parse(aUrl.search.substring(1)) as any
                        if (query != {} && query != undefined) {
                            authCode = query.code
                        }
                        res.writeHead(200, {'Content-Type': 'text/plain'})
                        res.write('Authorization captured. Return to Bracketcounter.')
                        res.end()
                        const httpTerminator = createHttpTerminator({server})
                        await httpTerminator.terminate()
                                            
                        // when the server is closed
                        console.log("Authorizing...")
                        let parameters = {
                            client_id: config.clientId,
                            client_secret: config.clientSecret,
                            redirect_uri: "http://127.0.0.1:" + port,
                            code_verifier: code_verifier,
                            code: authCode,
                            grant_type: "authorization_code"
                        }
                        let tokenResp = await this.api.getContent("https://oauth2.googleapis.com/token", parameters, true)
                        let tokenJson = JSON.parse(tokenResp)
                        authCache.accessToken = tokenJson.access_token
                        authCache.refreshToken = tokenJson.refresh_token
                        authCache.tokenExpiry = +(new Date()) + (tokenJson.expires_in * 1000)
                        fs.writeFileSync(config.authCache, JSON.stringify(authCache))
                        authData.access_token = authCache.accessToken
                        resolve(authData)
                    })
                    server.listen(port)
                } else {
                    if (authCache.tokenExpiry <= (+(new Date()) - 5000)) {
                        // use existing token
                        authData.access_token = authCache.accessToken
                    }
                    // refresh
                    this.isAuthing = true
                    console.log("Refreshing authorization...")
                    let parameters = {
                        client_id: config.clientId,
                        client_secret: config.clientSecret,
                        refresh_token: authCache.refreshToken,
                        grant_type: "refresh_token"
                    }
                    let tokenResp = await this.api.getContent("https://oauth2.googleapis.com/token", parameters, true)
                    let tokenJson = JSON.parse(tokenResp)
                    authCache.accessToken = tokenJson.access_token
                    authCache.tokenExpiry = +(new Date()) + (tokenJson.expires_in * 1000)
                    fs.writeFileSync(config.authCache, JSON.stringify(authCache))
                    this.isAuthing = false
                    authData.access_token = authCache.accessToken
                    resolve(authData)
                }
            } else {
                // API key
                authData.key = config.key
                resolve(authData)
            }
            
        })
    }


}
