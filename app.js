const express = require("express");
const mustacheExpress = require("mustache-express");
const Pool = require("pg").Pool;
const app = express();
const sessions = require("express-session");
const port = process.env.PORT || 3010;
const cookieParser = require("cookie-parser");

app.engine("mustache", mustacheExpress());
app.set("view engine", "mustache");
app.set("views", __dirname + "/views");

app.use(cookieParser());

app.use(
  sessions({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized: true,
    cookie: { maxAge: 86400000, secure: false },
    resave: false
  })
);

const pool = new Pool({
  user: "postgres",
  host: "168.119.168.41",
  database: "happymeter",
  password: "cff5bbc6e9851d8d8d05df294755b844",
  port: 5432
});

app.use(express.static("public"));

app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  pool.query("SELECT * FROM users", (err, result) => {
    if (req.cookies["sessionBenutzername"]) {
      res.render("index", {
        sessionBenutzername: req.cookies["sessionBenutzername"]
      });
    } else {
      res.render("index");
    }
  });
});

app.get("/login", (req, res) => {
  res.render("login");
});
app.get("/register", (req, res) => {
  res.render("register");
});
app.get("/dia", (req, res) => {
  if (!req.session.benutzerid) {
    res.redirect("/login");
    return;
  }
  // if (req.cookies["sessionBenutzername"]) {
  pool.query(
    "SELECT AVG(hvalue), datum FROM happyness WHERE datum >= date_trunc('day', NOW()) - INTERVAL '6 days ' AND user_id = $1 GROUP BY datum ORDER BY datum ASC;",
    [req.cookies["benutzerid"]],
    (error, result) => {
      if (error) {
        throw error;
      }
      const hvalues = [];
      const datums = [];

      result.rows.map((row) => {
        hvalues.push(row.avg);
        datums.push(row.datum);
      });

      const moment = require("moment");

      const dates = datums.map((datetime) => {
        const datetimeMoment = moment(datetime);
        return datetimeMoment.format("MM.DD");
      });

      req.session.hvalues = String(hvalues.join(", "));
      req.session.daten = dates.join(",");

      res.render("dia", {
        sessionBenutzername: req.cookies["sessionBenutzername"],
        benutzerid: req.cookies["benutzerid"],
        hvalues: req.session.hvalues,
        dates: req.session.daten
      });
    }
  );
  // } else {
  //   res.redirect("/login");
  // }
});
app.get("/input", (req, res) => {
  if (!req.session.benutzerid) {
    res.redirect("/login");
    return;
  }
  if (req.cookies["sessionBenutzername"]) {
    res.render("input", {
      sessionBenutzername: req.cookies["sessionBenutzername"]
    });
  } else {
    res.render("input");
  }
});

app.post("/login", function (req, res) {
  pool.query(
    "SELECT * FROM users WHERE username = $1",
    [req.body.username],
    (error, result) => {
      if (error) {
        throw error;
      }
      //bcrypt.compareSync() hat immer "false" ausgespuckt. Ich habe versucht das Passwort zu hashen, aber das gieng auch nicht.
      if (
        result.rows.length > 0 &&
        req.body.password === result.rows[0].passwort
      ) {
        req.session.benutzerid = result.rows[0].id;
        res.cookie("sessionBenutzername", req.body.username);
        res.redirect("/");
      } else {
        res.redirect("/login");
      }
    }
  );
});

app.post("/register", (req, res) => {
  pool.query(
    "INSERT INTO users (username, passwort) VALUES ($1, $2)",
    [req.body.username, req.body.password],
    (err, result) => {
      res.cookie("sessionBenutzername");
      res.redirect("/login");
    }
  );
});

app.post("/create", (req, res) => {
  pool.query(
    "INSERT INTO happyness (hvalue, datum, user_id) VALUES ($1, current_timestamp, $2)",
    [req.body.hvalue, req.session.benutzerid],
    (error, result) => {
      if (error) {
        throw error;
      }
      res.redirect("/dia");
    }
  );
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
