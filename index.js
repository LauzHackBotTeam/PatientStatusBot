const botbuilder = require('botbuilder');

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
    session.send("Welcome to StatusBot!");
    let options = new botbuilder.HeroCard(session)
      .text(`What do you want to do?`)
      .buttons([
        botbuilder.CardAction.imBack(session, "subscribe", "Subscribe to a patient status"),
        botbuilder.CardAction.imBack(session, "check", "Check patient status")
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

onboardingDialog.matches(/^(susbcribe)/i, "subscribeToPatientStatus")
  .matches(/^(check)/i, "checkPatientStatus");
  
bot.dialog('/', onboardingDialog);
bot.dialog('subscribeToPatientStatus', [
  (session, results, next) => {
    botbuilder.Prompts.text(session, "Tell me the patient code");
  },
  (session, results, next) => {
    // TODO: request to API to subscribe
    // rp({
    //   method: "POST",
    //   url: "http://herokuapp.com",
    //   body: {
    //     address: session.message.address,
    //     id: results.text
    //   }
    // })
    //   .then((resp)=> {
    //     console.log(resp);
        let patientName = "Jonathan Meyers";
        session.send(`You've subscribed to the patient ${patientName} status`);
    //   })
    //   .catch((err)=> {
    //     console.log(err);
    //   });
  }
]);
bot.dialog('checkPatientStatus', [
  (session, results, next) => {
    botbuilder.Prompts.text(session, "Tell me the patient code");
  },
  (session, results, next) => {
    // TODO: request to API to know the status
    // TODO: request to API to subscribe
    // rp({
    //   method: "GET",
    //   url: "http://herokuapp.com",
    //   body: {
    //     id: results.text
    //   }
    // })
    //   .then((resp)=> {
    //     console.log(resp);
        let patientName = "Jonathan Meyers";
        let patientStatus = "13:45 - Stable";
        session.send(`Last status for the patient ${patientName}:`);
        session.send(patientStatus);
    //   })
    //   .catch((err)=> {
    //     console.log(err);
    //   });
  }
]);