'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const subRouter = express.Router();
const url = require('url');
const requestPromise = require('request-promise');
const path = require('path');
const randomstring = require("randomstring");

const log = require('../lib/logger/logger');
const logger = log.logger.child({ sourceFile: log.file.setFilename(__filename) });


const createPayButtons = (displayUrl) => {
    return {
        messages: [{
            attachment: {
                type: 'template',
                payload: {
                    template_type: 'generic',
                    image_aspect_ratio: 'square',
                    elements: [{
                        title: 'Pay Now',
                        subtitle: 'Choose payment methods',
                        buttons: [{
                            type: 'web_url',
                            url: displayUrl[0],
                            title: 'Credit card',
                            messenger_extensions: true,
                            webview_height_ratio: 'compact' // Small view
                        },
                        {
                            type: 'web_url',
                            url: displayUrl[1],
                            title: 'Paymaya',
                            messenger_extensions: true,
                            webview_height_ratio: 'compact' // Small view
                        },
                        {
                            type: 'web_url',
                            url: displayUrl[2],
                            title: 'GCash',
                            messenger_extensions: true,
                            webview_height_ratio: 'compact' // Small view
                        }]
                    }]
                }
            }
        }]
    };
};

var restUrl = "";

subRouter.use('/css', express.static(path.join(__dirname, '../webview/css'),));
subRouter.use('/scripts', express.static(path.join(__dirname, '../webview/scripts'),));
subRouter.use('/images', express.static(path.join(__dirname, '../webview/images'),));

subRouter.use(bodyParser.json());

subRouter.get('/generate-payment-id', (request, response) => {
   var payment_id = randomstring.generate({
  		   	length: 8,
  		   	charset: 'numeric'
		   });
    response.send({
            "set_attributes":  {
            "payment_id": payment_id
           }
    });

});

subRouter.get('/show-pay', (request, response) => {
    console.log(request.query);
    const userId = request.query.userID;
    const payment_id = request.query.payment_id ;
    const displayUrl = [
                         subRouter.restUrl + '/fb/pay?userID=' + userId + '&payment_id=' + payment_id,
                         subRouter.restUrl + '/fb/paymaya?userID=' + userId + '&payment_id=' + payment_id,
                         subRouter.restUrl + '/fb/pay?userID=' + userId + '&payment_id=' + payment_id
    ];
    response.json(createPayButtons (displayUrl));
});

subRouter.get('/pay', function(req, res) {
    var userID = req.query.userID;
    var payment_id = req.query.payment_id ;
    var checkout_public_key = process.env.CHECKOUT_PUBLIC_KEY;
    var checkout_secret_key = process.env.CHECKOUT_SECRET_KEY;

    //test data
    var item_list = 'Paracetamol<br/>Medicol<br/>Cefalexin';
    var qty_list = '1<br/>2<br/>4';
    var price_list = '5.00<br/>10.00<br/>20.00';
    var total_price = "PHP 35.00";
    res.render(path.join(__dirname, '../webview/payment.html'),{
                                                                 userID:userID,
                                                                 payment_id:payment_id,
                                                                 item_list:item_list,
                                                                 qty_list:qty_list,
                                                                 price_list:price_list,
                                                                 total_price:total_price,
                                                                 checkout_public_key:checkout_public_key, 
                                                                 checkout_secret_key:checkout_secret_key,
								 restUrl:restUrl });
});

subRouter.get('/paymaya', function(req, res) {
    var userID = req.query.userID;
    var payment_id = req.query.payment_id ;
    var checkout_public_key = process.env.CHECKOUT_PUBLIC_KEY;
    var checkout_secret_key = process.env.CHECKOUT_SECRET_KEY;

    //test data
    var item_list = 'Paracetamol<br/>Medicol<br/>Cefalexin';
    var qty_list = '1<br/>2<br/>4';
    var price_list = '5.00<br/>10.00<br/>20.00';
    var total_price = "PHP 35.00";
    res.render(path.join(__dirname, '../webview/paymaya.html'),{
                                                                 userID:userID,
                                                                 payment_id:payment_id,
                                                                 item_list:item_list,
                                                                 qty_list:qty_list,
                                                                 price_list:price_list,
                                                                 total_price:total_price,
                                                                 checkout_public_key:checkout_public_key, 
                                                                 checkout_secret_key:checkout_secret_key,
								 restUrl:restUrl});
});

subRouter.post('/process-paymaya-payment', function(req, res) {
    //Base64 of:
    //pk-cP5SfWiULsViVtuswhEKCkuanfXdEkdF6mIRXDnH6A7:sk-X8qolYjy62kIzEbr0QRK1h4b4KDVHaNcwMYk39jInSl
    console.log(req.body[0].card_object)
    console.log(req.body[0].payment_object)
    var options = {
        method: 'POST',
        uri: 'https://pg-sandbox.paymaya.com/payments/v1/payment-tokens',
        form: req.body[0].card_object,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': process.env.PAYMAYA_PUBLIC_KEY
        }
    };
     
    requestPromise(options)
        .then(function (body) {
        var paymayaTokenResponse = JSON.parse(body)
        req.body[0].payment_object.paymentTokenId = paymayaTokenResponse.paymentTokenId
        if(paymayaTokenResponse.state == "AVAILABLE") {
            var payOptions = {
                method: 'POST',
                uri: 'https://pg-sandbox.paymaya.com/payments/v1/payments',
                form: req.body[0].payment_object,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': process.env.PAYMAYA_SECRET_KEY
                },
            };
            requestPromise(payOptions)
            .then(function (body) {
                var paymayaStatusResponse = JSON.parse(body);
                res.send({"status" : paymayaStatusResponse.status})
            }).catch(function(err){
                console.log(err)
            });
        }
        else {
            res.send({
                "state": paymayaResponse.state,
                "paymentTokenId":paymayaResponse.paymentTokenId
            });
        }
    })
    .catch(function (err) {
        console.log(err)
    });

});

subRouter.post('/notification', function (req, res) {
    const BOT_ID = process.env.BOT_ID;
    const CHATFUEL_TOKEN = process.env.CHATFUEL_TOKEN;
    
    const userId = req.body[0].messenger_id;
    const blockName = req.body[0].blockName;
	const messageContent = req.body[0].messageContent;

    const broadcastApiUrl = process.env.CHATFUEL_BROADCAST_URL + `${BOT_ID}/users/${userId}/send`;

    const query = Object.assign({
            chatfuel_token: CHATFUEL_TOKEN,
            chatfuel_block_name: blockName,
			messageContent: messageContent
        }
    );
    const chatfuelApiUrl = url.format({
        pathname: broadcastApiUrl,
        query
    });

    const options = {
        uri: chatfuelApiUrl,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    requestPromise.post(options)
        .then(() => {
            res.json({"response":"Message/s successfully sent."});
        });
});

var router = {
    subRouter,
    restUrl
}

module.exports =  router;
