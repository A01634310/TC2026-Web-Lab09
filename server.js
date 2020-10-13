var express = require("express");
var app = express();
var path = require("path");
var nodemailer = require("nodemailer");

const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();

var PORT = 3000;
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

var MAX_TABLES = 5;

const reservaciones = [];

const listaEspera = [];

let visitCount = 0;

// async..await is not allowed in global scope, must use a wrapper
async function sendMail(destination) {
  // Generate test SMTP service account from ethereal.email
  // Only needed if you don't have a real mail account for testing
  let testAccount = await nodemailer.createTestAccount();

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user, // generated ethereal user
      pass: testAccount.pass, // generated ethereal password
    },
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: '"Diego Estrada Talamantes" <a01634310@itesm.mx>', // sender address
    to: destination, // list of receivers
    subject: "Tu reservación está disponible!!", // Subject line
    text:
      "Se ha desocupado una mesa en el restaurante en el que se hizo una reservación, ha sido movido de la lista de espera a la lista de mesas principales. Favor de presentarse a más tardar en 15 minutos... Por favor :'v", // plain text body
  });

  console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...

  return nodemailer.getTestMessageUrl(info);
}

app.get("/api/", (req, res) => {
  res.send("Bienvenid@ al back-end de la página más sensual de todas!!");
});

app.get("/api/tables", (req, res) => {
  res.send(reservaciones);
});

app.get("/api/waitlist", (req, res) => {
  res.send(listaEspera);
});

app.get("/api/visitcount", (req, res) => {
  res.send({ count: visitCount });
});

app.post("/api/reservar", jsonParser, (req, res) => {
  req.body.sendEmail = false;
  if (reservaciones.length < MAX_TABLES) {
    reservaciones.push(req.body);
    res.send({ msg: "Reserva realizada con éxito" });
  } else {
    listaEspera.push(req.body);
    res.send({ msg: "Reserva asignada en lista de espera" });
  }
});

app.post("/api/countone", (req, res) => {
  visitCount += 1;
  res.send({ msg: "Se ha registrado una nueva visita!! " });
});

app.post("/api/waitlist_mark_email/:table_number", jsonParser, (req, res) => {
  listaEspera[req.params.table_number].sendEmail = true;
  res.send({
    msg: "Cuando haya disponibilidad se enviará un correo",
  });
});

app.delete("/api/remove_table/:table_number", jsonParser, (req, res) => {
  reservaciones.splice(req.params.table_number, 1);
  const siguienteMesa = listaEspera.shift();
  reservaciones.push(siguienteMesa);
  if (siguienteMesa.sendEmail) {
    sendMail(siguienteMesa.customerEmail).then((data) => {
      res.send({
        msg:
          "Reserva removida satisfactoriamente, correo ha sido enviado a siguiente mesa en línea de espera",
        url: data,
      });
    });
  } else {
    res.send({
      msg: "Reserva removida satisfactoriamente",
    });
  }
});

app.delete("/api/remove_waitlist/:table_number", jsonParser, (req, res) => {
  listaEspera.splice(req.params.table_number, 1);
  res.send({
    msg: "Reserva de lista de espera removida satisfactoriamente",
  });
});

// RUTAS DE FRONT-END //////////////////////////////////////////////////////////

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "home.html"));
});

app.get("/reserve", function (req, res) {
  res.sendFile(path.join(__dirname, "reserve.html"));
});

app.get("/tables", function (req, res) {
  res.sendFile(path.join(__dirname, "tables.html"));
});
