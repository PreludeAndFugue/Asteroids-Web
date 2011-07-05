/*******************************************************************************
 * Asteroids - using HTML5 canvas
 *
 * Gary Kerr, 19/11/2010
 ******************************************************************************/

var canvas;
var context;

// the main menu
var main_menu;
// the high score menu
var highscore_menu;
// the pause menu
var pause_menu;
// the game over menu
var gameover_menu;

// high scores table - this will be filled in by an XMLHttpRequest
high_scores_table = new Array();

// canvas dims
const WIDTH = 500;
const HEIGHT = 400;

// asteroid sizes
sizes = {
    LARGE: 25,
    MEDIUM: 12,
    SMALL: 5}

// asteroid speeds
speeds = {
    LARGE: 3,
    MEDIUM: 5,
    SMALL: 6}

// scores for each asteroid size
scores = {
    LARGE: 20,
    MEDIUM: 50,
    SMALL: 100}

// an array to hold asteroid instances
var asteroids;

// the ship
var ship;
// number of lives
var lives;
// the current level
var level;

// the ship's bullets
var bullets;
// the ufo's bullets
var bullets_ufo;

// the ufo
var ufo;

// timeout objects (interval IDs - from window.setInterval)
var t;
var t_b;

// is a game currently in progress
var playing = false;
// is the game paused
var paused = false;

// the score
var score;


/*******************************************************************************
 * UFOs - there are two types of ufos.
 *  1. stupid: fire in random direction
 *  2. intelligent: fire at ship
 ******************************************************************************/
function UFO()
{
    if (Math.random() < 0.33)
    {
        // intelligent ufos are less common
        this.intelligent = true;
        this.score = 1000;
    }
    else
    {
        this.intelligent = false;
        this.score = 200;
    }

    // position
    this.x = -10;
    this.y = (HEIGHT - 30)*Math.random() + 15;

    // velocity
    this.dx = 2.5;

    this.move = function()
    {
        this.x += this.dx;
    }

    this.boundary = function()
    {
        if (this.x > WIDTH + 10)
        {
            ufo = null;
            delete this;
        }
    }
    
    // ufo fires bullet
    this.fire = function()
    {
        var rotation = 0;
    
        if (this.intelligent)
        {
            if (this.x - ship.x != 0)
                rotation = Math.atan((ship.y - this.y)/(ship.x - this.x));
        }
        else
        {
            rotation = 2*Math.PI*Math.random()
        }
        
        var b = new Bullet(this.x, this.y, rotation);
        bullets_ufo.push(b);
    }
    
    // collision with ship bullets
    this.collision = function()
    {
        for (var bullet in bullets)
        {
            var dx = this.x - bullets[bullet].x;
            var dy = this.y - bullets[bullet].y;
            var dist = Math.sqrt(dx*dx + dy*dy);
            
            //console.debug(dist);
            
            // TODO: fix collision detection method for ufo
            if (dist < 9)
            {
                score += this.score;
                delete bullets[bullet];
                delete this;
                ufo = null;
                // exit for loop early since ufo is destroyed
                break;
            }
        }
    }

    this.draw = function(context)
    {
        context.save();
        
        context.strokeStyle = "rgb(255, 255, 255)";
        //context.fillStyle = "rgba(200, 200, 100, 0.4)";
        context.translate(this.x, this.y);

        context.beginPath();
        //context.arc(this.x, this.y, 6, 0, 2*Math.PI, true);
        context.moveTo(-8, 4);
        context.lineTo(8, 4);
        context.moveTo(9, 3);
        context.lineTo(9, 0);
        context.moveTo(8, -1);
        context.lineTo(4, -1);
        context.lineTo(4, 1);
        context.lineTo(-4, 1);
        context.lineTo(-4, -1);
        context.lineTo(-8, -1);
        context.moveTo(-9, 0);
        context.lineTo(-9, 3);
        context.closePath();
        context.stroke();
        //context.fill();
        
        context.moveTo(-4, -1);
        context.lineTo(0, -4);
        context.lineTo(4, -1);
        context.stroke();
        
        context.restore();
    }

}

/*******************************************************************************
 * Asteroids
 ******************************************************************************/
function Asteroid(x, y, dx, dy, r)
{
    // the asteroid's position
    this.x = x;
    this.y = y;
    // the asteroid's velocity
    this.dx = dx;
    this.dy = dy;
    // the asteroid's radius
    this.r = r;

    // move the asteroid by changing the position (x, y) by (dx, dy)
    this.move = function()
    {
        this.x += this.dx;
        this.y += this.dy;
    }

    // draw the asteroid using the 2d context object
    this.draw = function(context)
    {
        context.strokeStyle = "rgb(255, 255, 255)";
        context.fillStyle = "rgba(200, 100, 100, 0.4)";

        context.beginPath();
        context.arc(this.x, this.y, this.r, 0, 2*Math.PI, true);
        context.stroke();
        context.fill();
    }

    // check for boundary conditions
    this.boundary = function()
    {
        if (this.x < 0)
            this.x = WIDTH;
        else if (this.x > WIDTH)
            this.x = 0;

        if (this.y < 0)
            this.y = HEIGHT;
        else if (this.y > HEIGHT)
            this.y = 0;
    }

    // check for collisions
    // TODO: refactor this to remove duplication for bullet arrays
    this.collision = function()
    {
        // check ship bullets
        for (var bullet in bullets)
        {
            var dx = this.x - bullets[bullet].x;
            var dy = this.y - bullets[bullet].y;
            // the '-2' provides a bit of fuzziness
            var dist = dx*dx + dy*dy - 2;

            if (dist <= this.r*this.r)
            {
                // collision with bullet
                delete bullets[bullet];
                this.destroy(1);

                // this asteroid doesn't exist anymore so quit method before
                // checking collision with ship;
                return;
            }
        }
        
        // check ufo bullets
        for (var bullet in bullets_ufo)
        {
            var dx = this.x - bullets_ufo[bullet].x;
            var dy = this.y - bullets_ufo[bullet].y;
            // the '-2' provides a bit of fuzziness
            var dist = dx*dx + dy*dy - 2;

            if (dist <= this.r*this.r)
            {
                // collision with bullet
                delete bullets_ufo[bullet];
                this.destroy(0);

                // this asteroid doesn't exist anymore so quit method before
                // checking collision with ship;
                return;
            }
        }

        // check collision with ship
        dx = this.x - ship.x;
        dy = this.y - ship.y;
        dist = Math.sqrt(dx*dx + dy*dy);

        // 7 is size of ship!! fudge - need to create better way of detecting
        // collision
        if (dist <= this.r + 7)
        {
            lives -= 1;
            ship.reset();
            this.destroy(1);
        }
    }

    // destroy asteroid - helper function for this.collision()
    // if scoring is 1 then asteroid was destroyed by ship so increase score,
    // otherwise don't increase score
    this.destroy = function(scoring)
    {
        delete asteroids[asteroids.indexOf(this)];

        // create child asteroids and update score
        if (this.r == sizes.LARGE)
        {
            // large asteroid creates 2 medium asteroids
            score += scores.LARGE*scoring;
            create_asteroids(2, this.x, this.y, sizes.MEDIUM, speeds.MEDIUM);
        }
        else if (this.r == sizes.MEDIUM)
        {
            // medium asteroid creates 2 small asteroids
            score += scores.MEDIUM*scoring;
            create_asteroids(2, this.x, this.y, sizes.SMALL, speeds.SMALL);
        }
        else
        {
            score += scores.SMALL*scoring;
        }
    }
}

/*******************************************************************************
 * The ship
 ******************************************************************************/
function Ship()
{
    // position
    this.x = WIDTH/2;
    this.y = HEIGHT/2;
    // velocity
    this.dx = 0;
    this.dy = 0;
    // direction the ship is facing
    this.rotation = -Math.PI/2;
    // direction increment - when user presses buttons, this is how much to
    // change this.rotation for each key press
    this.rot_inc = 0.2;

    // draw the ship using the 2d context object
    this.draw = function(context)
    {
        context.save()
        context.strokeStyle = "rgb(255, 255, 255)";
        context.translate(this.x, this.y);
        context.rotate(this.rotation + Math.PI/2);

        context.beginPath();
        context.moveTo(-8, 10);
        context.lineTo(0, -10);
        context.lineTo(8, 10);
        context.lineTo(0, 6);
        context.closePath();
        context.stroke();

        context.restore();
    }

    // rotate the ship
    this.rotate = function(clockwise)
    {
        if (clockwise)
            this.rotation += this.rot_inc;
        else
            this.rotation -= this.rot_inc;
    }

    // fire a bullet
    this.fire = function()
    {
        var b = new Bullet(this.x, this.y, this.rotation);
        bullets.push(b);
    }

    // create thrust
    this.thrust = function()
    {
        // only apply thrust if speed is not too high (ie a max speed)
        if (this.dx < 10 && this.dy < 10)
        {
            this.dx += 3*Math.cos(this.rotation);
            this.dy += 3*Math.sin(this.rotation);
        }
    }

    // move the ship
    this.move = function()
    {
        this.x += this.dx;
        this.y += this.dy;

        // deceleration (ship will always slow down when no thrust applied)
        this.dx *= 0.93;
        this.dy *= 0.93;
    }

    // check for boundary conditions
    this.boundary = function()
    {
        if (this.x < 0)
            this.x = WIDTH;
        else if (this.x > WIDTH)
            this.x = 0;

        if (this.y < 0)
            this.y = HEIGHT;
        else if (this.y > HEIGHT)
            this.y = 0;
    }
    
    // check collision with ufo bullets
    this.collision = function()
    {
        for (var bullet in bullets_ufo)
        {
            var dx = this.x - bullets_ufo[bullet].x;
            var dy = this.y - bullets_ufo[bullet].y;
            var dist = Math.sqrt(dx*dx + dy*dy);
            // TODO: fix ship collision detection
            // 7 is size of ship!
            if (dist < 7)
            {
                lives -= 1;
                ship.reset();
                delete bullets_ufo[bullet];
            }
        }
    }

    // reset the ship to the centre of the screen
    this.reset = function()
    {
        this.x = WIDTH/2;
        this.y = HEIGHT/2;
        this.dx = 0;
        this.dy = 0;
        this.rotation = -Math.PI/2;
    }
}

/*******************************************************************************
 * Bullets
 ******************************************************************************/
function Bullet(x, y, rotation)
{
    // velocity
    this.dx = 4*Math.cos(rotation);
    this.dy = 4*Math.sin(rotation);
    // position - use dx and dy to position the bullet at the front of the ship
    this.x = x + this.dx;
    this.y = y + this.dy;
    // a bullet has a liftime - keep track of its age
    this.age = 0;

    // move the bullet and increase its age by one
    this.move = function()
    {
        this.x += this.dx;
        this.y += this.dy;

        this.age += 1;
    }

    // draw the bullet on the canvas
    this.draw = function(context)
    {
        context.strokeStyle = "rgb(255, 255, 255)";
        context.strokeRect(this.x, this.y, 1, 1);
    }

    // check for boundary conditions
    this.boundary = function()
    {
        if (this.x < 0)
            this.x = WIDTH;
        else if (this.x > WIDTH)
            this.x = 0;

        if (this.y < 0)
            this.y = HEIGHT;
        else if (this.y > HEIGHT)
            this.y = 0;
    }
}

/*******************************************************************************
 * loader - initialise the game when the html is loaded.
 ******************************************************************************/
function loader()
{
    // create high_scores_table from XMLHttpRequest
    xhr = new XMLHttpRequest();
            
    xhr.onreadystatechange = function()
    {
        if (xhr.readyState == 4 && xhr.status == 200)
        {
            // items is array of strings - each string contains name & score
            var items = xhr.responseText.split("\n");

            for (var i = 0; i < items.length; i++)
            {
                // create array - name & score
                var score_split = items[i].split("\t");
                high_scores_table[i + 1] = {name: score_split[0], score: parseInt(score_split[1])};
            }
        }
    }
    
    xhr.open("GET", "asteroids.txt", true);
    // this line to stop browser caching
    xhr.setRequestHeader("If-Modified-Since", "Sat, 20 Nov 2010 00:00:00 GMT");
    xhr.send();

    // initialise the canvas
    canvas = document.getElementById("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    // initialise the context object
    context = canvas.getContext('2d');

    // menus
    main_menu = document.getElementById("main");
    highscore_menu = document.getElementById("high");
    pause_menu = document.getElementById("pause");
    gameover_menu = document.getElementById("gameover");

    main();
}

/*******************************************************************************
 * main - show main menu and animate background
 ******************************************************************************/
function main()
{
    // display the main menu
    display_menus(10, -10, -10, -10);

    // asteroids for the background animation
    asteroids = new Array();
    create_asteroids(4, null, null, sizes.LARGE, speeds.LARGE);
    create_asteroids(4, null, null, sizes.MEDIUM, speeds.MEDIUM);
    create_asteroids(6, null, null, sizes.SMALL, speeds.SMALL);

    // start background animation
    if (!t_b)
        t_b = window.setInterval(animate_background, 50);
}

/*******************************************************************************
 * high_scores - update the html high score table
 ******************************************************************************/
function high_scores()
{
    for (var i = 1; i <= 8; i++)
    {
        document.getElementById("name" + i).innerHTML = high_scores_table[i]["name"];
        document.getElementById("score" + i).innerHTML = high_scores_table[i]["score"];
    }

    // display the high score menu
    display_menus(-10, 10, -10, -10);
}

/*******************************************************************************
 * new_high_score - update the high score table
 ******************************************************************************/
function new_high_score()
{
    var new_score = score;
    var new_name = document.getElementById("name").value;
    
    for (var i = 1; i <= 8; i++)
    {
        if (new_score > high_scores_table[i].score ||
                (new_score < score && new_score >= high_scores_table[i].score))
        {
            // keep a record of current score and name in temp vars
            var temp_score = high_scores_table[i].score;
            var temp_name = high_scores_table[i].name;
            
            // replace with new values
            high_scores_table[i].name = new_name;
            high_scores_table[i].score = new_score;
            
            // transfer temp vars
            new_name = temp_name;
            new_score = temp_score;
        }
    }
    
    main();
}

/*******************************************************************************
 * game_over - display the game over menu at the end of a game
 ******************************************************************************/
function game_over()
{
    // clear game loop
    window.clearInterval(t);

    // start background animation
    t_b = window.setInterval(animate_background, 50);

    // set the score
    document.getElementById("score").innerHTML = score;
    
    // current 8th position score
    score8 = high_scores_table[8].score;
    
    if (score > score8)
    {
        // new score in high score table
        document.getElementById("newhighscore").style.display = "block";
        document.getElementById("nohighscore").style.display = "none";
    }
    else
    {
        // not a new high score
        document.getElementById("newhighscore").style.display = "none";
        document.getElementById("nohighscore").style.display = "block";
    }

    // display the game over menu
    display_menus(-10, -10, -10, 10);
}

/*******************************************************************************
 * go - starts the game
 ******************************************************************************/
function go()
{
    // hide the menus
    display_menus(-10, -10, -10, -10);

    // stop the background animation
    window.clearInterval(t_b);
    t_b = null;

    // create the ship
    ship = new Ship();

    // the bullets arrays
    bullets = new Array();
    bullets_ufo = new Array();

    // reset the score
    score = 0;

    // reset the number of lives
    lives = 3;

    // reset the level (level is the number of asteroids to create 4 - 12)
    level = 4;

    // empty the asteroids array before starting
    asteroids = new Array();

    // create the asteroids
    create_asteroids(level, null, null, sizes.LARGE, speeds.LARGE);

    ufo = null;

    if (!playing)
    {
        playing = true;
        t = window.setInterval(play, 30);
    }
}

/*******************************************************************************
 * play - play the game, the main loop
 ******************************************************************************/
function play()
{
    // clear the canvas
    context.fillStyle = "rgb(0, 0, 0)";
    context.fillRect(0, 0, WIDTH, HEIGHT);

    // remove old bullets
    bullets = bullets.filter(function(el, ind, arr) {return el.age < 65;});
    bullets_ufo = bullets_ufo.filter(function(el, ind, arr) {return el.age < 55;});

    // draw bullets
    for (var bullet in bullets)
    {
        bullets[bullet].move();
        bullets[bullet].boundary();
        bullets[bullet].draw(context);
    }
    
    // draw ufo bullets
    for (var bullet in bullets_ufo)
    {
        bullets_ufo[bullet].move();
        bullets_ufo[bullet].boundary();
        bullets_ufo[bullet].draw(context);
    }

    // deal with ufos
    if (ufo)
    {
        ufo.draw(context);
        // only fire 2% of the time
        if (Math.random() < 0.02)
            ufo.fire();
        ufo.move();
        ufo.collision();
        // ufo may be destroyed by collision
        if (ufo)
            ufo.boundary();
    }
    else if (Math.random() < 0.001)
    {
        // create a ufo once every 500 frames - approx 25s.
        ufo = new UFO();
    }

    // remove dead asteroids from array
    asteroids = asteroids.filter(function(el, ind, arr) {return el;});

    // draw asteroids
    for (var ast in asteroids)
    {
        asteroids[ast].draw(context);
        asteroids[ast].move();
        asteroids[ast].boundary();
        asteroids[ast].collision();
        //asteroids[ast].draw(context);
    }

    // move and draw the ship
    ship.move(context);
    ship.boundary();
    ship.collision();
    ship.draw(context);

    // draw the score
    draw_score(context);

    // check for end of level
    if (asteroids.length == 0)
    {
        level++;
        // maximum difficulty level is 12
        if (level > 12)
            level = 12;
        
        // create asteroids for new level
        create_asteroids(level, null, null, sizes.LARGE, speeds.LARGE);
    }

    // check if game over
    if (lives <= 0)
    {
        playing = false;
        game_over();
    }
}

/*******************************************************************************
 * animate_background - draw some asteroids on the canvas when the menus are
 * being displayed
 ******************************************************************************/
function animate_background()
{
    // clear the canvas
    context.fillStyle = "rgb(0, 0, 0)";
    context.fillRect(0, 0, WIDTH, HEIGHT);

    // move the asteroids
    for (var ast in asteroids)
    {
        asteroids[ast].draw(context);
        asteroids[ast].move();
        asteroids[ast].boundary();
    }
}

/*******************************************************************************
 * create_asteroids - helper function to create n asteroids with radius r at
 * location (x_in, y_in). If location not specified, then random locations
 * are chosen.
 ******************************************************************************/
function create_asteroids(n, x_in, y_in, r, speed)
{
    var create_coords = x_in ? false : true;

    for (var i = 0; i < n; i++)
    {
        if (create_coords)
        {
            x_in = Math.floor(WIDTH*Math.random()/2 - WIDTH/4);
            if (x_in < 0)
                x_in += WIDTH;

            y_in = Math.floor(HEIGHT*Math.random()/2 - HEIGHT/4);
            if (y_in < 0)
                y_in += HEIGHT;
        }
        var x = x_in;
        var y = y_in;

        var dx = speed*(Math.random() - 0.5);
        var dy = speed*(Math.random() - 0.5);

        asteroids.push(new Asteroid(x, y, dx, dy, r));
    }
}

/*******************************************************************************
 * draw_score - writes the score on the canvas
 ******************************************************************************/
function draw_score(context)
{
    context.fillStyle = "rgb(255, 255, 255)";
    context.font = "11pt Verdana";
    context.textAlign = "right";
    context.fillText(score, WIDTH/2, 30);

    // draw the number of lives remaining
    context.save()
    context.strokeStyle = "rgb(255, 255, 255)";
    context.translate(20, 20);
    context.beginPath();
    context.moveTo(-8, 10);
    context.lineTo(0, -10);
    context.lineTo(8, 10);
    context.lineTo(0, 6);
    context.closePath();
    context.stroke();
    context.restore();

    context.fillText("x " + lives, 57, 30);
}

/*******************************************************************************
 * display_menus: change the zIndex of menus
 ******************************************************************************/
function display_menus(main, high, pause, gameover)
{
    highscore_menu.style.zIndex = high;
    main_menu.style.zIndex = main;
    pause_menu.style.zIndex = pause;
    gameover_menu.style.zIndex = gameover;
}

/*******************************************************************************
 * keydown - react to key presses
 ******************************************************************************/
function keydown(event)
{
    var keynum = event.which;

    //alert(keynum);

    switch (keynum)
    {
        case 37:
            // left arrow
            ship.rotate(false);
            break;
        case 39:
            // right arrow
            ship.rotate(true);
            break;
        case 40:
            // down arrow - fire
            ship.fire();
            break;
        case 38:
            // up arrow - thrust
            ship.thrust();
            break;
        case 65:
            // 'a' key - pause
            if (playing)
            {
                if (!paused)
                {
                    paused = true;
                    window.clearInterval(t);
                    display_menus(-10, -10, 10, -10);
                }
                else
                {
                    paused = false;
                    t = window.setInterval(play, 50);
                    display_menus(-10, -10, -10, -10);
                }
            }
            break;
        case 79:
            // 'o' key - quit game
            if (playing)
            {
                playing = false;
                window.clearInterval(t);
                main();
            }
            break;
        /*
        case 49:
            ufo = new UFO();
            ufo.intelligent = false;
            break;
        case 50:
            ufo = new UFO();
            ufo.intelligent = true;
            break;
        */
    }
}