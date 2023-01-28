const mongoose = require('mongoose')
const shortId = require('shortid')
const urlModel = require("../model/urlModel")
const validator = require('../validator/validation')
const redis = require('redis')
const { promisify } = require('util')



//1. Connect to the redis server
const redisClient = redis.createClient(
    17752,
    "redis-17752.c301.ap-south-1-1.ec2.cloud.redislabs.com",
    { no_ready_check: true }
);
redisClient.auth("NsqLb34F2P7NmBPTDi95X5OH9SHvEYx4", function (err) {
    if (err) throw err;
});

redisClient.on("connect", async function () {
    console.log("Connected to Redis..");
});

//2. Prepare the functions for each command

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);



const urlShorten = async function (req, res) {
    try {
        let data = req.body
        if (Object.keys(data).length == 0) { return res.status(400).send({ status: false, message: "data is not present" }) }
        let longUrl = req.body.url
        if (validator.valid(longUrl) == false) { return res.status(400).send({ status: false, message: "invalid  longUrl" }) }
        if (validator.regForUrl(longUrl) == false) { return res.status(400).send({ status: false, message: "invalid  longUrl format" }) }
        let baseUrl = 'http://localhost:3000/'

        let shortenUrl = shortId.generate().toLowerCase()
        // console.log(shortenUrl)
        const cacheUrlData = await GET_ASYNC(`${longUrl}`)
        if (cacheUrlData) {
            return res.status(200).send(cacheUrlData)
        }
        let response = {
            "longUrl": longUrl,
            "shortUrl": baseUrl + shortenUrl,
            "urlCode": shortenUrl
        }
        let existingUrl = await urlModel.findOne({ longUrl: longUrl }).select({ _id: 0, __v: 0 })
        if (existingUrl) {
            return res.send({ status: true, data: existingUrl })
        }
        
        await urlModel.create(response)
        await SET_ASYNC(`${longUrl}`, JSON.stringify(response), 'EX', 30 * 60)
        return res.send({ status: true, data: response })

    } catch (err) {
        return res.send({ status: false, message: err.message }) 

    }

}


const getUrl = async function (req, res) {
    try {
        let urlCode = req.params.urlCode
        const cacheUrlData = await GET_ASYNC(`${urlCode}`)
        if (cacheUrlData) {
            return res.status(302).redirect(cacheUrlData)
        }
        let response = await urlModel.findOne({ urlCode: urlCode })
        if (!response)  return res.status(404).send({status: false , message : "Data not found"})
        await SET_ASYNC(`${urlCode}`, JSON.stringify(response.longUrl), 'Ex', 30*60)
        { return res.status(302).redirect(response.longUrl) }
       
    } catch (err) {
        res.send({ status: false, message: err.message })
    }
}



module.exports.urlShorten = urlShorten
module.exports.getUrl = getUrl
