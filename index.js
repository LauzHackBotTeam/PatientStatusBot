const botbuilder = require('botbuilder');
const express = require('express');
const rp = require('request-promise');
const API_URL = process.env.API_URL;
const HUB_URL = process.env.HUB_URL;

//create an express server
let app = express();
app.use(express.static('public'));
let port = process.env.port || process.env.PORT || 3978;
app.listen(port, function () {
    console.log('%s listening in port %s', app.name, port);
});

const DEFAULT_STATUS = ['before surgery', 'started', 'finished', 'recovery room', 'exiting recovery'];

//create a chat connector for the bot
let connector = new botbuilder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

//load the botbuilder classes and build a unversal bot using the chat connector
let bot = new botbuilder.UniversalBot(connector, {
	localizerSettings: {
		defaultLocale: "en"
	}
});

//hook up bot endpoint
app.post("/api/messages", connector.listen());


let onboardingDialog = new botbuilder.IntentDialog()
  .onBegin((session, results, next) => {
    let options = new botbuilder.HeroCard(session)
      .text(`What do you want to do?`)
      .buttons([
        botbuilder.CardAction.imBack(session, "menu", "Check menu"),
        botbuilder.CardAction.imBack(session, "status", "Check status")
      ]);

    let msg = new botbuilder.Message(session)
			.attachments([options]);
    session.send(msg);
    postMessage(session.message.address, msg);
  })
  .onDefault([
    (session, results, next) => {
      let msg = `I don't undestand that`;
      session.send(msg);
      postMessage(session.message.address, msg);
    }
  ]);

onboardingDialog
  .matches(/^(status)/i, "checkPatientStatus")
  .matches(/^(menu)/i, "checkDailyMenu");
  
bot.dialog('/', [
  (session, results, next) => {
    let msg = "Welcome to StatusBot!";
    session.send(msg);
    postMessage(session.message.address, msg);

    let msg1 = "Tell me the code of the patient";
    botbuilder.Prompts.text(session, msg1);
    session.send(msg1);
    postMessage(session.message.address, msg1);
  },
  (session, results, next) => {
    rp({
      method: "POST",
      url: API_URL + 'subscribe',
      body: {
        address: session.message.address,
        patientId: results.response
      },
      json: true
    })
      .then((resp)=> {
        session.privateConversationData.patientName = resp.name;
        session.privateConversationData.patientId = results.response;

        let msg = `You've subscribed to the status of the patient ${session.privateConversationData.patientName}`;
        session.send(msg);
        postMessage(session.message.address, msg);
        session.beginDialog('onboarding');
      })
      .catch((err)=> {
        console.log(err);
      });
  }
]);

bot.dialog('onboarding', onboardingDialog);
bot.dialog('checkPatientStatus', [
  (session, results, next) => {
    // TODO: request to API to know the status
    rp({
      method: "GET",
      url: API_URL + session.privateConversationData.patientId + '/surgery',
      json: true
    })
      .then((resp)=> {
        let msg = `New status for ${session.privateConversationData.patientName}: ${resp.status}`;
        session.send(msg);
        postMessage(session.message.address, msg);
        session.endDialog();
      })
      .catch((err)=> {
        console.log(err);
      });
  }
]);

bot.dialog('checkDailyMenu', [
  (session, results, next) => {
    // TODO: request to API to know the status
    rp({
      method: "GET",
      url: API_URL + session.privateConversationData.patientId + '/menu',
      json: true
    })
      .then((resp)=> {
        // let menu = resp;
        for(let meal in resp) {
          let msg = `${meal}: ${resp[meal]}`;
          session.send(msg);
          postMessage(session.message.address, msg);
        }
        session.endDialog();
      })
      .catch((err)=> {
        console.log(err);
      });
  }
]);

// Middleware
bot.use({
  botbuilder: [
    (session, next) => {
      let message = session.message.text.toLowerCase();
      if(message == "clear") return session.endConversation("Ending conversation...");
      next();
    }
  ]
});


// Proactive Notifications
bot.on('trigger', (data) => {
	let address = data.value.address;
  let text = data.value.text;
  if(!DEFAULT_STATUS.includes(text)) text = `New message from the doctor: ${text}`;
  else text = `New status: ${text}`;
  let msg = new botbuilder.Message()
    .address(address)
    .text(text)
  bot.send(msg);
  postMessage(address, text);
});



let postMessage = (address, message) => {
  request({
    method: 'POST',
    url: HUB_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      address,
      message,
    },
    json: true,
  }, (error, response, body) => {
    console.log('Response received');
  });
}