const botbuilder = require('botbuilder');
const express = require('express');
const rp = require('request-promise');

//create an express server
let app = express();
app.use(express.static('public'));
let port = process.env.port || process.env.PORT || 3978;
app.listen(port, function () {
    console.log('%s listening in port %s', app.name, port);
});

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
  })
  .onDefault([
    (session, results, next) => {
      session.send(`I don't undestand that`);
    }
  ]);

onboardingDialog
  .matches(/^(status)/i, "checkPatientStatus")
  .matches(/^(menu)/i, "checkDailyMenu");
  
bot.dialog('/', [
  (session, results, next) => {
    session.send("Welcome to StatusBot!");
    botbuilder.Prompts.text(session, "Tell me the code of the patient");
  },
  (session, results, next) => {
    rp({
      method: "POST",
      url: process.env.API_URL + 'subscribe',
      body: {
        address: session.message.address,
        patientId: results.response
      },
      json: true
    })
      .then((resp)=> {
        console.log(resp);
        let patientName = "Jonathan Meyers";
        session.send(`You've subscribed to the patient ${patientName} status`);
        session.privateConversationData.patientCode = results.response;
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
    // rp({
    //   method: "GET",
    //   url: "http://herokuapp.com",
    //   body: {
    //     id: session.privateConversationData.patientCode
    //   }
    // })
    //   .then((resp)=> {
    //     console.log(resp);
        let patientName = "Jonathan Meyers";
        let patientStatus = "13:45 - Stable";
        session.send(`Last status for the patient ${patientName}:`);
        session.send(patientStatus);
        session.endDialog();
    //   })
    //   .catch((err)=> {
    //     console.log(err);
    //   });
  }
]);

bot.dialog('checkDailyMenu', [
  (session, results, next) => {
    // TODO: request to API to know the status
    // rp({
    //   method: "GET",
    //   url: "http://herokuapp.com",
    //   body: {
    //     id: session.privateConversationData.patientCode
    //   }
    // })
    //   .then((resp)=> {
    //     console.log(resp);
        // let menu = resp.menu;
        let menu = {
          lunch: "meal1 meal2",
          dinner: "meal3 and meal4"
        };
        for(let meal in menu) {
          session.send(`${meal}: ${menu[meal]}`);
        }
        session.endDialog();
    //   })
    //   .catch((err)=> {
    //     console.log(err);
    //   });
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
  let text = data.vale.text;

  let msg = new builder.Message()
  .address(address)
  .text(text)
  bot.send(msg);
});