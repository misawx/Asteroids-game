//preluare canvas
const canvas = document.getElementById('canvasJoc');
const ctx = canvas.getContext('2d');

//game status - obiect care retine toate informatiile despre un joc la un moment dat; 
//aici vom regasi date precum dimenisuni/unghi nava, nr de vieti ramase, scor, asteroizii si rachetele active la un moment dat etc.
const gameStatus = {
    spaceship: {
        //va aparea in centrul ecranului/canvasului
        x: canvas.width / 2,
        y: canvas.height / 2,
        size: 25,
        angle: 0,
        speed: 5, 
        score: 0,
        nrLives: 3
    },
    missiles: [],
    asteroids: [],
    keys: {}, //va tine evidenta tastelor apasate/ridicate, de exemplu: {'ArrowUp':false, 'ArrowDown':true, 'x':true, ...}
    pointsUntilExtraLife: 500 //cand utiilizatorul a obtinut 500 puncte, catsiga o alta viata
};


//functie care genereaza o valoarea aleatoare in intervalul [min,max)
//folosit pt generarea aleatorie a vitezei asterozilor
function getRandomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

//vom avea nevoie de 2 clase: Asteroid si Missile
class Asteroid {
    constructor() {

        //coordonatele sunt generate aleator
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        //health -  valori intre 1 si4
        this.health = Math.floor(Math.random() * 4) + 1; //Math.random->val intre [0, 1); Math.random()*4->val in [0,4); apoi rotunjire prin scadere(=> minim 0, maxim 3), la care adunam 1 => minim 1, maxim 4
        this.size =  this.health * 10 + 15;//fiecare unitate de health adauga 10px la dimenisunea asteroidului
        //viteza pe x si respectiv pe y va fi intre -1.5 si 1.5 pixeli
        this.dx = getRandomInRange(-1.5, 1.5);
        this.dy = getRandomInRange(-1.5, 1.5);
    }

    //desenare asteroid
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); //desenare asteroid (in forma de cerc)

        //cu cat asteroidul are mai multe vieti, cu atat culoarea acestuia se apropie de rosu
        if (this.health == 1) ctx.fillStyle = 'green'
        else if (this.health == 2) ctx.fillStyle = 'Gold'
        else if (this.health == 3) ctx.fillStyle = 'DarkOrange'
        else ctx.fillStyle = 'red'

        ctx.fill();

        //scriere nr de vieti ale asteroidului in mijlocul acestuia
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText(this.health.toString(), this.x, this.y);
    }

    update() {
        //deplasare pe axele x si y cu viteza data(care poate fi intre -1.5 si 1.5 px)
        this.x += this.dx;
        this.y += this.dy;

        //daca asteroidul iese printr-o parte a ecranului, va aparea pe partea opusa
        if (this.x < 0) 
            this.x = canvas.width;
        if (this.x > canvas.width) 
            this.x = 0;
        if (this.y < 0) 
            this.y = canvas.height;
        if (this.y > canvas.height) 
            this.y = 0;
    }
}

//clasa racheta
class Missile {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.speed = 10;
        this.dx = Math.cos(angle) * this.speed;//calculeaza componenta orizontala a vitezei (adica pe axa X)
        this.dy = Math.sin(angle) * this.speed;//calculeaza componenta verticala a vitezei(pe axa y)
    }
    

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);//racheta este un cerc cu raza de 3 pixeli
        ctx.fillStyle = 'orange';
        ctx.fill();
    }

    //desenare noua pozitie/deplasare racheta
    update() {
        this.x += this.dx; 
        this.y += this.dy;
    }
}

// desenare nava spatiala
function drawSpaceship() {
    //salvam starea actuala a contextului pt a putea reveni la acesta dupa desenarea navei
    ctx.save();
    //nava va fi un triunghi

    //translatarea contextului asigura desenarea navei relativ la coordonatele state.ship.x si state.ship.y, nu relativ la originea coltului ecranului
    // coordonatele ship.x si ship.y reprezinta centrul navei
    ctx.translate(gameStatus.spaceship.x, gameStatus.spaceship.y);
    ctx.rotate(gameStatus.spaceship.angle); //in radiani
    ctx.beginPath();

    // varful navei se afla la distanta state.ship.size de centrul navei (x,y)
    ctx.moveTo(gameStatus.spaceship.size, 0);//plaseaza punctul de inceput al desenarii formei la dreapta de centrul navei (in varful trinughiului)
    ctx.lineTo(-gameStatus.spaceship.size, -gameStatus.spaceship.size / 2);// creeaza o latura a triunghiului plecand din dreapta centrului navei si mergand in stanga si in sus
    ctx.lineTo(-gameStatus.spaceship.size, gameStatus.spaceship.size / 2);// creeaza o a doua latura plecand de la punctul anterior(stanga sus) si mergand in jos; !!linie paralela cu axa OY
    ctx.closePath();//inchide forma, creand un triunghi, adica traseaza o linie din stanga jos si merge spre punctul initial( dreapta sus)
    ctx.fillStyle = 'white';
    //desenarea efectiva
    ctx.fill();

    //revenim la starea anterioara (de dinainte de desenarea navei) a contextului
    ctx.restore();
}

//verificare coliziuni
function checkForCollisions() {

    //coliziune asteroid-nava
    gameStatus.asteroids.forEach(asteroid => {
        const dx = gameStatus.spaceship.x - asteroid.x;
        const dy = gameStatus.spaceship.y - asteroid.y;
        //calcularea distantei dintre nava si asteroid, folosind formula matematica
        const distance = Math.sqrt(dx * dx + dy * dy);
        var ok = true;//pt a ne asigura ca nu scade mai multe vieti ale navei la coliziunea cu un asteroid de la un moment dat

        if (distance < asteroid.size + gameStatus.spaceship.size && ok === true) {
            {
                gameStatus.spaceship.nrLives--;
                ok = false; //deci ne am asigurat ca se va scadea doar o viata a navei
            }
            if (gameStatus.spaceship.nrLives <= 0) {
                gameOver();
            } else {
                resetSpaceshipPosition();
            }
        }
    });

    // coliziuni asteroid-asteroid
    //parcurgem toti asteroizii si fiecare asteroid se compara cu urmatorul din lista, pt a evita verificarea de mai multe ori a aceleiasi perechi
    for (let i = 0; i < gameStatus.asteroids.length; i++) {
        for (let j = i + 1; j < gameStatus.asteroids.length; j++) {
            const asteroid1 = gameStatus.asteroids[i];
            const asteroid2 = gameStatus.asteroids[j];
            const dx = asteroid2.x - asteroid1.x;
            const dy = asteroid2.y - asteroid1.y;
            //calcularea distantei intre 2 asteroizi conform formulei matematice
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < asteroid1.size + asteroid2.size) {
                // interschimbare viteze pt coliziune elastica = schimb de viteze
                [asteroid1.dx, asteroid2.dx] = [asteroid2.dx, asteroid1.dx];
                [asteroid1.dy, asteroid2.dy] = [asteroid2.dy, asteroid1.dy];
            }
        }
    }

    //coliziune racheta-asteroid
    //vor ramane pe ecran doar rachetele care nu au au avut coliziune cu un asteroid
    gameStatus.missiles = gameStatus.missiles.filter(missile => {
        let asteroidHit = false;//folosit pt a filtra rachetele care dispar in umra coliziunilor cu asteroizi
        gameStatus.asteroids.forEach(asteroid => {
            const dx = missile.x - asteroid.x;
            const dy = missile.y - asteroid.y;
            //calculare distanta intre racheta si asteroid
            const distance = Math.sqrt(dx * dx + dy * dy);

            //daca distanta dintre racheta si asteroid este mai mica decat raza asteroidului, inseamna ca racheta a lovit asteroidul
            if (distance < asteroid.size) {
                asteroidHit = true;
                asteroid.health--;
                asteroid.size = asteroid.size - asteroid.size / 4 //reduce marimea asteroidului
                if (asteroid.health <= 0) {
                    gameStatus.spaceship.score += 100; //daca am distrus complet un asteroid, atunci scorul se incrementeaza cu 100
                    gameStatus.asteroids = gameStatus.asteroids.filter(a => a !== asteroid); //se mentin in lista game.asteroids doar asteroizii diferiti de cel care a fost eliminat de racheta

                    // verifica daca nava obtine o viata extra (cand scorul este divizibil cu 500)
                    if (gameStatus.spaceship.score % gameStatus.pointsUntilExtraLife === 0) {
                        gameStatus.spaceship.nrLives++;
                    }
                }
            }
        });

        //racheta dispare dupa coliziune!!
        return !asteroidHit;
    });
}

//resetare pozitie nava
function resetSpaceshipPosition() {
    //readucem nava la pozitia initiala: mijlocul canvasului
    gameStatus.spaceship.x = canvas.width / 2;
    gameStatus.spaceship.y = canvas.height / 2;
    gameStatus.spaceship.angle = 0;
}

//resetare joc
function reset() {
    gameStatus.spaceship.nrLives = 3;
    gameStatus.spaceship.score = 0;
    gameStatus.asteroids = [];
    gameStatus.missiles = [];
    resetSpaceshipPosition();
    gameStatus.keys = {}; //fara linia aceasta asta, dupa ce nava pierde o viata si i se reseteaza pozitia,
                         // se va misca singura in directia pe care o avea la ultima coliziune cu un asteroid

    //creare asteroizi initiali
    for (let i = 0; i < 5; i++) {
        gameStatus.asteroids.push(new Asteroid());
    }
}

//handler pt finalizarea jocului
function gameOver() {
    alert('Oops, you lost! Click OK to restart the game.');//pop-up in browser
    reset();
}

//event listeners
document.addEventListener('keydown', e => gameStatus.keys[e.key] = true); //la evenimentul keydown, tasta este considerata apasata, deci activa => se executa functia asociata
document.addEventListener('keyup', e => gameStatus.keys[e.key] = false);//la evenimentul keyup (tasta este eliberata/ridicata), tasta respectiva nu mai este considerata activa=> nu se mai executa functia asociata

//Game loop
function gameLoop() {
    //clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    //handle input tastatura
    if (gameStatus.keys['ArrowUp']===true) gameStatus.spaceship.y -= gameStatus.spaceship.speed;
    if (gameStatus.keys['ArrowDown']===true) gameStatus.spaceship.y += gameStatus.spaceship.speed;
    if (gameStatus.keys['ArrowRight']===true) gameStatus.spaceship.x += gameStatus.spaceship.speed;
    if (gameStatus.keys['ArrowLeft']===true) gameStatus.spaceship.x -= gameStatus.spaceship.speed;
    if (gameStatus.keys['c']===true) gameStatus.spaceship.angle += 0.1;
    if (gameStatus.keys['z']===true) gameStatus.spaceship.angle -= 0.1;
    if (gameStatus.keys['x'] ===true && gameStatus.missiles.length < 3) {
        gameStatus.missiles.push(new Missile(gameStatus.spaceship.x, gameStatus.spaceship.y, gameStatus.spaceship.angle));
        gameStatus.keys['x'] = false; //previne lansarea continua a rachetelor (maxim 3 rachete pot fi pe ecran la un moment dat)
    }

    //update si desenare obiecte
    gameStatus.asteroids.forEach(asteroid => {
        asteroid.update();
        asteroid.draw();
    });

    gameStatus.missiles.forEach(missile => {
        missile.update();
        missile.draw();
    });

    //elimina rachetele ce ies din ecran
    gameStatus.missiles = gameStatus.missiles.filter(missile =>
        missile.x >= 0 && missile.x <= canvas.width &&
        missile.y >= 0 && missile.y <= canvas.height
    );

    //wrap nava in jurul canvasului
    if (gameStatus.spaceship.x < 0)
        gameStatus.spaceship.x = canvas.width;
    if (gameStatus.spaceship.x > canvas.width)
        gameStatus.spaceship.x = 0;

    if (gameStatus.spaceship.y < 0)
        gameStatus.spaceship.y = canvas.height;
    if (gameStatus.spaceship.y > canvas.height)
        gameStatus.spaceship.y = 0;

    drawSpaceship();
    checkForCollisions();

    // desenaza display status joc
    ctx.fillStyle = 'white';
    ctx.font = '18px Arial';
    ctx.fillText(`Lives: ${gameStatus.spaceship.nrLives}    Score: ${gameStatus.spaceship.score}`, 600, 20); //text desenat relativ la canvas

    //creare de noi asteroizi daca avem mai putin de 5 activi
    if (gameStatus.asteroids.length < 5) {
        gameStatus.asteroids.push(new Asteroid());
    }

    requestAnimationFrame(gameLoop);
}

// start joc
reset();
gameLoop();
