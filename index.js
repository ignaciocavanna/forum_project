// Import dei moduli necessari
import bodyParser from "body-parser";
import express from "express";
import fs from "fs";
import ejs from "ejs";
import session from "express-session";
import bcrypt from "bcrypt";

// Inizializzazione dell'app Express
const app = express();
const port = 3000;

app.set('view engine', 'ejs');

// Configurazione di Express
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));

// Configurazione di express-session
app.use(session({
    secret: 'keyboard', // Chiave segreta per firmare il cookie della sessione
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 600000 }
}));

// Caricamento dei dati degli utenti e delle password dai file JSON
const usernamesJSON = fs.readFileSync("usernames.json");
const usernames = JSON.parse(usernamesJSON);

const passwordsJSON = fs.readFileSync("passwords.json");
const passwords = JSON.parse(passwordsJSON);

// Inizializzazione di un array per i post
let postsDB = [];
// Variabili globali
const title = [];
let topicSection = "home";

// Simulazione del database degli utenti
const users = [];
const utentiTotali = {
    utente: [],
    data: []
};

// Rotta per la registrazione di un nuovo utente
app.post("/register", async (req, res) => {
    try {
        // Destructuring delle informazioni inviate nel corpo della richiesta
        const { username, password } = req.body;
        req.session.username = username;
        console.log(req.session.username)
        console.log(users)

        // Controllo se l'utente esiste già nel database
        if (users.find(user => user.username === username)) {
            //return res.status(400).json({ message: "Username già in uso" });
            res.render("register.ejs", {
                message: "Username già in uso"
            })
            return;
        }

        var data = new Date();
        utentiTotali.utente.push(req.session.username);
        utentiTotali.data.push(data);
        console.log(utentiTotali);

        // Hashing della password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Aggiunta dell'utente al database
        users.push({ username, password: hashedPassword });
        console.log(hashedPassword);

        // Risposta alla richiesta di registrazione
        res.redirect('/home');
        //res.status(201).json({ message: "Utente registrato con successo" });
    } catch (error) {
        console.error("Errore durante la registrazione:", error);
        res.status(500).json({ message: "Errore durante la registrazione" });
    }
});

// Rotta per l'autenticazione dell'utente
app.post("/login", async (req, res) => {
    try {
        // Destructuring delle informazioni inviate nel corpo della richiesta
        const { username, password } = req.body;

        // Trova l'utente nel database
        const user = users.find(user => user.username === username);

        // Se l'utente non esiste, restituisci un messaggio di errore
        if (!user) {
            res.render("index.ejs", {
                message: "Username non valido"
            })
            return;
        }

        // Confronto della password fornita con quella nel database
        const passwordMatch = await bcrypt.compare(password, user.password);

        // Se le password non corrispondono, restituisci un messaggio di errore
        if (!passwordMatch) {
            res.render("index.ejs", {
                message: "Credenziali non valide"
            })
            return
        }

        //Acquisizione useername per sessione
        const userSession = req.body.username;
        req.session.username = userSession;

        // Autenticazione riuscita
        if (req.session.username) {
            res.render('logged.ejs', {
            username: username,
            topic: topicSection,
            posts: postsDB,
            title: title,
            postId: "0",
            content: "",
            });
            return;
    };
    res.redirect('/');
        //res.status(200).json({ message: "Accesso consentito" });
    } catch (error) {
        console.error("Errore durante il login:", error);
        res.status(500).json({ message: "Errore durante il login" });
    }
});

//Gestione della richiesta GET alla pagina di Login
app.get("/goToLoginPage", (req, res) => {
    res.render("index.ejs", {
        message: null
    });
})

//Gestione della richiesta GET alla pagina di registrazione
app.get("/goToRegisterPage", (req, res) => {
    res.render("register.ejs", {
        message: null
    });
})

        var url = "/logOut";
app.get("/logOut", (req, res) => {
    console.log(req.session.username);
    req.session.username = null;
    console.log(req.session.username)
    res.render("index.ejs", {
        message: null
    });
})

// Gestione della richiesta GET alla homepage
app.get("/", (req, res) => {
    if (req.session.username) {
        res.render("/home", {
            topic: topicSection,
            posts: postsDB,
            title: title,
            postId: "0",
            content: "",
        });
        return;
        console.log(req.session.username)
    }
    res.render("register.ejs", {
        message: ""
    });
});

// Gestione della richiesta GET alla pagina home
app.get('/home', (req, res) => {
    if (!req.session.username) {
        res.redirect('/');
        return;
    }
    res.render('logged.ejs', {
        username: req.session.username,
        topic: topicSection,
        posts: postsDB,
        title: title,
        postId: "0",
        content: "",
    });
});

// Gestione della richiesta POST per il cambio di sezione
app.post("/topic", (req, res) => {
    const topicSection = req.body[Object.keys(req.body)[0]];
    const index = postsDB.findIndex(post => post.id.toString() === topicSection.toString());
    
    if (req.session.username) {

        // Se il topic non è un numero, mostra la sezione corrente senza modifiche
        if (isNaN(topicSection)) {
            res.render("logged.ejs", {
            topic: topicSection,
            posts: postsDB,
            title: "",
            content: "",
            username: req.session.username
        });
        return;
        }
        // Altrimenti, mostra i dettagli del post selezionato
        res.render('logged.ejs', {
            title: postsDB[index].title,
            content: postsDB[index].content,
            topic: index,
            posts: postsDB,
            username: req.session.username
        });
    } else {
        res.redirect('/');
    }
});

// Gestione della richiesta POST per la visualizzazione dei post personali
app.post("/personalPosts", (req, res) => {
    const userReq = req.session.username
    const postsDBLength = postsDB.length
    let index = [];

    if (req.session.username){
        for (let i=0; i<postsDBLength; i++){
        if (postsDB[i].owner.toString() === userReq.toString()) {
            index.push(i); // Aggiungi l'indice del post trovato all'array degli indici
        }
        }
        console.log("user che ha cliccato: "+userReq);
        console.log("post presenti ?:"+index)
        const personalPosts = [];
        for (let i = 0; i < index.length; i++) {
            const postId = index[i]; // Ottieni l'id del post dall'array degli indici
            const post = postsDB[postId]; // Ottieni il post dall'array dei post usando l'id
            personalPosts.push(post); // Aggiungi il post all'array dei post personali
        }
        console.log(personalPosts)
        if (index !== -1){
            res.render("logged.ejs", {
                topic: "userPosts",
                posts: personalPosts,
                username: req.session.username
            });
        }
        else {
            res.render("logged.ejs", {
                topic: "userPosts",
                posts: [],
                username: req.session.username
            });
        }
    } else {
        res.redirect('/')
    }
    
});

// Gestione della richiesta POST per l'eliminazione di un post
app.post('/elimina-post', (req, res) => {
    const postId = req.body.postId;

    // Trova l'indice del post nell'array dei post
    const index = postsDB.findIndex(post => post.id.toString() === postId.toString());

    if (index !== -1) {
        // Rimuovi il post dall'array
        postsDB.splice(index, 1);
        res.json({ success: true });
    } else {
        res.json({ success: false, message: "Post non trovato." });
    }
});

// Gestione della richiesta POST per la modifica di un post
app.post('/modifica-post', (req, res) => {
    const postId = req.body.postId;
    const nuovoContenuto = req.body.nuovoContenuto;
    const nuovoTitolo = req.body.nuovoTitolo;

    // Trova il post corrispondente e aggiorna il contenuto
    const postIndex = postsDB.findIndex(posts => posts.id === parseInt(postId));
    console.log(postIndex)

    if (postIndex !== -1) {
        if (nuovoContenuto.trim() !== "") {
            postsDB[postIndex].content = nuovoContenuto;
        };
        if (nuovoTitolo.trim() !== "") {
            postsDB[postIndex].title = nuovoTitolo;
        }
        //postsDB[postIndex].content = nuovoContenuto;
        //postsDB[postIndex].title = nuovoTitolo;
        res.send({ success: true, message: "Post aggiornato con successo!" });
        console.log(postsDB)
    } else {
        res.send({ success: false, message: "Post non trovato." });
    }
});

// Gestione della richiesta POST per la creazione di un nuovo post
app.post("/post", (req, res) => {
    const postsFromForm = req.body.posts;
    const titleFromForm = req.body.title;
    const topTopicQuery = req.body.topTopicQuery;
    const postOwner = req.session.username;
    const newPost = { id: (postsDB.length), title: titleFromForm, content: postsFromForm, owner: req.session.username, topTopicQueryResult: topTopicQuery };
    
    if (req.session.username){

        // Aggiungi il nuovo post all'array dei post solo se sia il titolo che il contenuto non sono vuoti
        if (newPost.title !== '' && newPost.content !== '') {
            postsDB.push(newPost);
            console.log(postsDB);
        };

        res.render("logged.ejs", {
            topic: "cT",
            posts: postsDB,
            title: "",
            content: "",
            username: req.session.username
        });
    } else {
        res.redirect('/')
    }
    
});

// Avvio del server Express
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});


//https://colorhunt.co/palette/222831393e4600adb5eeeeee