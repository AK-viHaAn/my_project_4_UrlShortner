
const express = require('express')
const router = express.Router();
const urlController = require('../controller/urlController.js')


router.post("/url/shorten",urlController.urlShorten)
router.get("/:urlCode",urlController.getUrl)







module.exports=router