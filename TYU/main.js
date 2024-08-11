phina.globalize();

console.log = function () { };  // ログを出す時にはコメントアウトする

const FPS = 60;  // 60フレ

const SCREEN_WIDTH = 1080;              // スクリーン幅
const SCREEN_HEIGHT = 1920;              // スクリーン高さ
const SCREEN_CENTER_X = SCREEN_WIDTH / 2;   // スクリーン幅の半分
const SCREEN_CENTER_Y = SCREEN_HEIGHT / 2;  // スクリーン高さの半分

const FONT_FAMILY = "'Press Start 2P','Meiryo',sans-serif";
const ASSETS = {
    image: {
        "utena": "./resource/utena_128.png",
        "tommy": "./resource/tommy_128.png",
        "yasu": "./resource/yasu_128.png",

        "ball0": "./resource/nihonshu_64.png",
        "ball1": "./resource/beer_64.png",
        "ball2": "./resource/alc_free_64.png",
        "ball3": "./resource/shouchu_64.png",
        "ball4": "./resource/manipani_64.png",

        "mini_ball": "./resource/balls_32.png?1",

        "rso0": "./resource/pole_256.png",
    },
    spritesheet: {
        "player_ss":
        {
            frame: {
                "width": 128,
                "height": 128,
                "cols": 1, // フレーム数（横）
                "rows": 1, // フレーム数（縦）
            },
            animations: {
                "stand": {
                    "frames": [0],
                    "next": "stand",
                    "frequency": 10,
                },
            }
        },
        "mini_ball_ss":
        {
            frame: {
                "width": 32,
                "height": 32,
                "cols": 5, // フレーム数（横）
                "rows": 1, // フレーム数（縦）
            },
            animations: {
                "ball0": {
                    "frames": [0],
                    "next": "ball0",
                    "frequency": 10,
                },
                "ball1": {
                    "frames": [1],
                    "next": "ball1",
                    "frequency": 10,
                },
                "ball2": {
                    "frames": [2],
                    "next": "ball2",
                    "frequency": 10,
                },
                "ball3": {
                    "frames": [3],
                    "next": "ball3",
                    "frequency": 10,
                },
                "ball4": {
                    "frames": [4],
                    "next": "ball4",
                    "frequency": 10,
                },
            }
        }

    },
    sound: {
        "coin_se": 'https://iwasaku.github.io/test7/NEMLESSSTER/resource/coin05.mp3',
        "miss_se": 'https://iwasaku.github.io/test9/TT/resource/blip02.mp3',
        "goal_se": './resource/levelup.mp3',
    }
};

// 定義
const GAME_MODE = defineEnum({
    START_INIT: {
        value: 0,
    },
    START: {
        value: 1,
    },
    GOAL_INIT: {
        value: 2,
    },
    GOAL: {
        value: 3,
    },
    END_INIT: {
        value: 4,
    },
    END: {
        value: 5,
    },
});

let group0 = null;  // 路肩、路面
let group1 = null;  // ミニマップ、飲酒ゲージ
let group2 = null;  // tommy,yasu
let group3 = null;  // 弾
let group4 = null;  // utena
let group5 = null;  // ステータス系
let utena = null;
let tommy = null;
let yasu = null;
let randomSeed = 3557;
let randomMode = false;
let ballArray = [];     // 管理用
let ballReload = [];    // リロード用
let ballMag = [];       // 実際の残弾
let gameMode = GAME_MODE.START_INIT;

phina.main(function () {
    let app = GameApp({
        startLabel: 'logo',
        backgroundColor: 'black',
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        assets: ASSETS,
        fps: FPS,

        // シーンのリストを引数で渡す
        scenes: [
            {
                className: 'LogoScene',
                label: 'logo',
                nextLabel: 'title',
            },
            {
                className: 'TitleScene',
                label: 'title',
                nextLabel: 'game',
            },
            {
                className: 'GameScene',
                label: 'game',
                nextLabel: 'game',
            },
        ]
    });

    // iOSなどでユーザー操作がないと音がならない仕様対策
    // 起動後初めて画面をタッチした時に『無音』を鳴らす
    app.domElement.addEventListener('touchend', function dummy() {
        var s = phina.asset.Sound();
        s.loadFromBuffer();
        s.play().stop();
        app.domElement.removeEventListener('touchend', dummy);
    });

    // fps表示
    //app.enableStats();

    // 実行
    app.run();
});

/*
* ローディング画面をオーバーライド
*/
phina.define('LoadingScene', {
    superClass: 'DisplayScene',

    init: function (options) {
        this.superInit(options);
        // 背景色
        var self = this;
        var loader = phina.asset.AssetLoader();

        // 明滅するラベル
        let label = phina.display.Label({
            text: "",
            fontSize: 64,
            fill: 'white',
        }).addChildTo(this).setPosition(SCREEN_CENTER_X, SCREEN_CENTER_Y);

        // ロードが進行したときの処理
        loader.onprogress = function (e) {
            // 進捗具合を％で表示する
            label.text = "{0}%".format((e.progress * 100).toFixed(0));
        };

        // ローダーによるロード完了ハンドラ
        loader.onload = function () {
            // Appコアにロード完了を伝える（==次のSceneへ移行）
            self.flare('loaded');
        };

        // ロード開始
        loader.load(options.assets);
    },
});

/*
 * ロゴ
 */
phina.define("LogoScene", {
    superClass: 'DisplayScene',

    init: function (option) {
        this.superInit(option);
        this.localTimer = 0;
        this.font1 = false;
        this.font2 = false;
    },

    update: function (app) {
        // フォントロード完了待ち
        var self = this;
        document.fonts.load('10pt "Press Start 2P"').then(function () {
            self.font1 = true;
        });
        document.fonts.load('10pt "icomoon"').then(function () {
            self.font2 = true;
        });
        if (this.font1 && this.font2) {
            self.exit();
        }
    }
});

/*
 * タイトル
 */
phina.define("TitleScene", {
    superClass: 'DisplayScene',

    init: function (option) {
        this.superInit(option);

        this.titleLabel = Label({
            text: "Tommy,\nYasu,\nand\nUtena",
            fontSize: 64,
            fontFamily: FONT_FAMILY,
            align: "center",
            fill: "#fff",
            x: SCREEN_CENTER_X,
            y: SCREEN_CENTER_Y - 256,
        }).addChildTo(this);

        this.startButton = Button({
            text: "START",
            fontSize: 32,
            fontFamily: FONT_FAMILY,
            fill: "#444",
            x: SCREEN_CENTER_X,
            y: SCREEN_CENTER_Y + 256,
            cornerRadius: 8,
        }).addChildTo(this);

        this.storybyLabel = Label({
            text: "Story\nby",
            fontSize: 32,
            fontFamily: FONT_FAMILY,
            align: "center",
            fill: "#fff",
            x: SCREEN_CENTER_X,
            y: SCREEN_CENTER_Y + 256 + 160 + 48,
        }).addChildTo(this);
        this.emuumemuuButton = Button({
            text: "@emuumemuu",
            fontSize: 32,
            fontFamily: FONT_FAMILY,
            fill: "#000",
            x: SCREEN_CENTER_X,
            y: SCREEN_CENTER_Y + 256 + 160 + 128,
            width: 360,
            height: 48,
        }).addChildTo(this);
        this.localTimer = 0;

        let self = this;
        this.startButton.onpointstart = function () {
            self.exit();
        };
        this.emuumemuuButton.onclick = function () {
            window.open('https://twitter.com/emuumemuu');
        };

    },


    update: function (app) {
    }
});

/*
 * ゲーム
 */
phina.define("GameScene", {
    superClass: 'DisplayScene',

    init: function (option) {
        this.superInit(option);
        this.backgroundColor = '#808080';

        clearArrays();

        group0 = DisplayElement().addChildTo(this);
        group1 = DisplayElement().addChildTo(this);
        group2 = DisplayElement().addChildTo(this);
        group3 = DisplayElement().addChildTo(this);
        group4 = DisplayElement().addChildTo(this);
        group5 = DisplayElement().addChildTo(this);

        yasu = new Yasu().addChildTo(group2);
        tommy = new Tommy().addChildTo(group2);
        utena = new Utena().addChildTo(group4);

        // 路肩
        this.roadLeftShape = PathShape({
            paths: [
                Vector2(-SCREEN_WIDTH / 2, -SCREEN_HEIGHT / 2),  // 左上
                Vector2(-SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2),  // 左下
                Vector2(0, -SCREEN_HEIGHT / 2),                 // 上
                Vector2(-SCREEN_WIDTH / 2, -SCREEN_HEIGHT / 2),  // 左上
            ],
            padding: 0,
            stroke: "#fff",
            fill: 'black',
        }).addChildTo(group0).setPosition(SCREEN_CENTER_X, SCREEN_CENTER_Y);
        this.roadRightShape = PathShape({
            paths: [
                Vector2(SCREEN_WIDTH / 2, -SCREEN_HEIGHT / 2),  // 右上
                Vector2(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2),  // 右下
                Vector2(0, -SCREEN_HEIGHT / 2),                 // 上
                Vector2(SCREEN_WIDTH / 2, -SCREEN_HEIGHT / 2),  // 右上
            ],
            padding: 0,
            stroke: "#fff",
            fill: 'black',
        }).addChildTo(group0).setPosition(SCREEN_CENTER_X, SCREEN_CENTER_Y);

        // 電柱
        RoadSideObject(0, (SCREEN_HEIGHT / 4) * 0).addChildTo(group0);
        RoadSideObject(SCREEN_WIDTH, (SCREEN_HEIGHT / 4) * 1).addChildTo(group0);
        RoadSideObject(0, (SCREEN_HEIGHT / 4) * 2).addChildTo(group0);
        RoadSideObject(SCREEN_WIDTH, (SCREEN_HEIGHT / 4) * 3).addChildTo(group0);

        // 飲酒ゲージ
        this.drinkGaugeBg = RectangleShape({
            width: 64,
            height: SCREEN_HEIGHT - 512,
            padding: 0,
            cornerRadius: 16,
            fill: "white",
        }).addChildTo(group5).setPosition(SCREEN_WIDTH - 64, SCREEN_CENTER_Y - 64);
        this.drinkGauge = DrinkGauge({
            paths: [
                Vector2(- 24, 1),  // 左上
                Vector2(+ 24, 1),  // 右上
                Vector2(+ 24, 0),  // 右下
                Vector2(- 24, 0),  // 左下
            ],
            padding: 0,
            stroke: "#fff",
            fill: "red",
        }).addChildTo(group5).setPosition(SCREEN_WIDTH - 64, SCREEN_HEIGHT - 336);
        this.drinkIcon = DrinkIcon().addChildTo(group5);

        // ミニマップ
        this.drinkGaugeBg = RectangleShape({
            width: SCREEN_WIDTH - 96,
            height: 32,
            padding: 0,
            cornerRadius: 8,
            fill: "white",
        }).addChildTo(group5).setPosition(SCREEN_CENTER_X, 128 + 32);
        miniTommy = new MiniTommy().addChildTo(group5);
        miniYasu = new MiniYasu().addChildTo(group5);

        // 弾倉
        ballReload = shuffle([0, 1, 2, 0, 1, 2, 0, 1, 3, 4]);
        ballMag = [ballReload[0], ballReload[1], ballReload[2]];
        for (let ii = 0; ii < 3; ii++) {
            ballArray.push(MiniBall(ii).addChildTo(group5));
        }

        // ハート
        this.heart = HeartShape({
            radius: 1,
            padding: 0,
            fill: "pink",
            shadow: "pink",
            shadowBlur: 4,
        }).addChildTo(group4).setPosition(SCREEN_CENTER_X, SCREEN_CENTER_Y);
        this.heart.alpha = 0.0;

        this.timeStrLabel = Label({
            text: "TIME",
            fontSize: 32,
            fontFamily: FONT_FAMILY,
            align: "center",
            fill: "#fff",
            shadow: "#000",
            shadowBlur: 10,
            x: SCREEN_CENTER_X,
            y: 32,
        }).addChildTo(group5);
        this.nowTimeLabel = Label({
            text: "00:00:00.000",
            fontSize: 64,
            fontFamily: FONT_FAMILY,
            align: "center",
            fill: "#fff",
            shadow: "#000",
            shadowBlur: 10,
            x: SCREEN_CENTER_X,
            y: 96,
        }).addChildTo(group5);
        this.countdownLabel = Label({
            text: "3",
            fontSize: 256,
            fontFamily: FONT_FAMILY,
            align: "center",
            fill: "#fff",
            shadow: "#000",
            shadowBlur: 10,
            x: SCREEN_CENTER_X,
            y: SCREEN_CENTER_Y,
        }).addChildTo(group5);
        this.gameOverLabel = Label({
            text: "GOAL",
            fontSize: 128 + 64,
            fontFamily: FONT_FAMILY,
            align: "center",
            fill: "#fff",
            shadow: "#000",
            shadowBlur: 10,
            x: SCREEN_CENTER_X,
            y: SCREEN_CENTER_Y,
        }).addChildTo(group5);

        this.xButton = Button({
            text: String.fromCharCode(0xe902),
            fontSize: 32,
            fontFamily: "icomoon",
            fill: "#7575EF",
            x: SCREEN_CENTER_X - 160 - 80,
            y: SCREEN_CENTER_Y + (SCREEN_CENTER_Y / 2),
            cornerRadius: 8,
            width: 60,
            height: 60,
        }).addChildTo(group5);
        this.bskyButton = Button({
            text: String.fromCharCode(0xe900),
            fontSize: 32,
            fontFamily: "icomoon",
            fill: "#7575EF",
            x: SCREEN_CENTER_X - 160 + 80,
            y: SCREEN_CENTER_Y + (SCREEN_CENTER_Y / 2),
            cornerRadius: 8,
            width: 60,
            height: 60,
        }).addChildTo(group5);
        this.threadsButton = Button({
            text: String.fromCharCode(0xe901),
            fontSize: 32,
            fontFamily: "icomoon",
            fill: "#7575EF",
            x: SCREEN_CENTER_X - 160,
            y: SCREEN_CENTER_Y + (SCREEN_CENTER_Y / 2),
            cornerRadius: 8,
            width: 60,
            height: 60,
        }).addChildTo(group5);
        this.restartButton = Button({
            text: "RESTART",
            fontSize: 32,
            fontFamily: FONT_FAMILY,
            fill: "#B2B2B2",
            x: SCREEN_CENTER_X + 160,
            y: SCREEN_CENTER_Y + (SCREEN_CENTER_Y / 2),
            cornerRadius: 8,
            width: 240,
            height: 60,
        }).addChildTo(group5);

        this.gameOverLabel.alpha = 0.0;
        this.xButton.alpha = 0.0;
        this.bskyButton.alpha = 0.0;
        this.threadsButton.alpha = 0.0;
        this.restartButton.alpha = 0.0;
        this.xButton.sleep();
        this.bskyButton.sleep();
        this.threadsButton.sleep();
        this.restartButton.sleep();

        var self = this;
        this.restartButton.onpointstart = function () {
            stageTimer = 0;
            self.exit();
        };

        this.buttonAlpha = 0.0;
        if (!randomMode) randomSeed = 3557;
        this.countdownTimer = 1.5 * FPS;
        this.frame = 0;
        this.stopBGM = false;
        gameMode = GAME_MODE.START_INIT;
    },

    update: function (app) {
        switch (gameMode) {
            case GAME_MODE.START_INIT:
                if (--this.countdownTimer > 0 * FPS) {
                    if (this.countdownTimer > 1 * FPS) {
                        this.countdownLabel.text = 3;
                    } else if (this.countdownTimer > 0.5 * FPS) {
                        this.countdownLabel.text = 2;
                    } else if (this.countdownTimer > 0 * FPS) {
                        this.countdownLabel.text = 1;
                    }
                    break;
                }
                gameMode = GAME_MODE.START;
            // FALLTHRU
            case GAME_MODE.START:
                if (this.countdownTimer > -0.5 * FPS) {
                    this.countdownTimer--;
                    this.countdownLabel.text = "GO";
                } else {
                    this.countdownLabel.text = "";
                }
                this.frame++;
                this.nowTimeLabel.text = framesToHMS(this.frame);
                break;
            case GAME_MODE.GOAL_INIT:
                gameMode = GAME_MODE.GOAL;
                this.gameOverLabel.alpha = 1.0;
                this.heart.x = tommy.x;
                this.heart.y = tommy.y;
                this.heart.alpha = 1.0;
            // FALLTHRU
            case GAME_MODE.GOAL:
                this.heart.radius += 2.1;
                if (++this.heart.radius >= 250) {
                    gameMode = GAME_MODE.END_INIT;
                }
                break;
            case GAME_MODE.END_INIT:
                {
                    var postText = "Tommy, Yasu & Utena\nタイム: " + this.nowTimeLabel.text;
                    var postURL = "https://iwasaku.github.io/test16/TYU/";
                    var postTags = "#ネムレス #NEMLESSS #始発待ちアンダーグラウンド";
                    this.xButton.onclick = function () {
                        // https://developer.x.com/en/docs/twitter-for-websites/tweet-button/guides/web-intent
                        var shareURL = "https://x.com/intent/tweet?text=" + encodeURIComponent(postText + "\n" + postTags + "\n") + "&url=" + encodeURIComponent(postURL);
                        window.open(shareURL);
                    };
                    this.bskyButton.onclick = function () {
                        // https://docs.bsky.app/docs/advanced-guides/intent-links
                        var shareURL = "https://bsky.app/intent/compose?text=" + encodeURIComponent(postText + "\n" + postTags + "\n" + postURL);
                        window.open(shareURL);
                    };
                    this.threadsButton.onclick = function () {
                        // https://developers.facebook.com/docs/threads/threads-web-intents/
                        var shareURL = "https://www.threads.net/intent/post?text=" + encodeURIComponent(postText + "\n" + postTags + "\n") + "&url=" + encodeURIComponent(postURL);
                        window.open(shareURL);
                    };

                }
                gameMode = GAME_MODE.END;
            // FALLTHRU
            case GAME_MODE.END:
                this.buttonAlpha += 0.05;
                if (this.buttonAlpha > 1.0) {
                    this.buttonAlpha = 1.0;
                }
                this.xButton.alpha = this.buttonAlpha;
                this.bskyButton.alpha = this.buttonAlpha;
                this.threadsButton.alpha = this.buttonAlpha;
                this.restartButton.alpha = this.buttonAlpha;
                if (this.buttonAlpha > 0.7) {
                    this.xButton.wakeUp();
                    this.bskyButton.wakeUp();
                    this.threadsButton.wakeUp();
                    this.restartButton.wakeUp();
                }
        }
    }
});

/*
 */
phina.define("Utena", {
    superClass: "Sprite",

    init: function (option) {
        this.superInit("utena", 128, 128);
        this.anim = FrameAnimation('player_ss').attachTo(this);
        this.anim.fit = false;
        this.setPosition(SCREEN_CENTER_X, SCREEN_HEIGHT - 128).setScale(2, 2);
        this.setInteractive(true);
        this.setBoundingType("circle");
        this.radius = 64;
        this.anim.gotoAndPlay("stand");
    },

    onpointstart: function () {
        if (gameMode != GAME_MODE.START) return;

        console.log(ballMag.length + ":" + ballMag);
        if (ballMag.length != 0) {
            Ball(ballMag.shift(), this.x, this.y).addChildTo(group3);
        }
    },

    onpointmove: function (e) {
        if (gameMode != GAME_MODE.START) return;

        this.x = e.pointer.x;
        if (this.x < 48) this.x = 48;
        if (this.x > SCREEN_WIDTH - 48) this.x = SCREEN_WIDTH - 48;
    },

    onpointend: function () {
        if (gameMode != GAME_MODE.START) return;
        for (let ii = 0; ii < group3.children.length; ii++) {
            if (group3.children[ii].isMove) continue;
            group3.children[ii].isMove = true;
        }
    },

    update: function (app) {
    },
});

/*
*/
phina.define("Tommy", {
    superClass: "Sprite",

    init: function (option) {
        this.superInit("tommy", 128, 128);
        this.anim = FrameAnimation('player_ss').attachTo(this);
        this.anim.fit = false;
        this.setPosition(SCREEN_CENTER_X, SCREEN_CENTER_Y).setScale(1.0, 1.0);
        this.setInteractive(false);
        this.setBoundingType("circle");
        this.radius = 48;
        this.anim.gotoAndPlay("stand");
        this.drink = 0.0;
        this.ratio = 1.0;
        this.dir = (Math.random() < 0.5) ? 1 : -1;   // -1:左 1:右
        this.orgX = SCREEN_CENTER_X;
        this.mile = 0.0;
    },

    update: function (app) {
        if ((gameMode != GAME_MODE.START_INIT) && (gameMode != GAME_MODE.START)) return;

        this.drink -= 0.005;
        if (this.drink <= 0.0) {
            this.drink = 0.0;
            this.dir = (Math.random() < 0.5) ? 1 : -1;   // -1:左 1:右
            return;
        }

        let delta = this.drink * this.dir * 1.6;
        if (delta < -64) delta = -64;
        if (delta > 64) delta = 64;
        this.orgX += delta;
        if (this.orgX < 48) {
            this.dir = 1;
            this.x = 48;
        }
        if (this.orgX > SCREEN_WIDTH - 48) {
            this.dir = -1;
            this.x = SCREEN_WIDTH - 48;
        }
        let scale = calcScale(this.y);
        this.setScale(this.dir, 1.0);
        this.x = ((this.orgX - SCREEN_WIDTH / 2) * scale) + (SCREEN_WIDTH / 2);
        this.mile += this.drink;
    },
});

/*
*/
phina.define("MiniTommy", {
    superClass: "Sprite",

    init: function (option) {
        this.superInit("tommy", 128, 128);
        this.anim = FrameAnimation('player_ss').attachTo(this);
        this.anim.fit = false;
        this.setPosition(0, 128).setScale(0.5, 0.5);
        this.setInteractive(false);
        this.setBoundingType("circle");
        this.radius = 48;
        this.anim.gotoAndPlay("stand");
    },

    update: function (app) {
        if ((gameMode != GAME_MODE.START_INIT) && (gameMode != GAME_MODE.START)) return;
        this.x = (((yasu.y + SCREEN_CENTER_Y) / (SCREEN_CENTER_Y * 2)) * SCREEN_WIDTH + (128 * 0.5)) * 0.91;
    },
});

/*
*/
phina.define("Yasu", {
    superClass: "Sprite",

    init: function (option) {
        this.superInit("yasu", 128, 128);
        this.anim = FrameAnimation('player_ss').attachTo(this);
        this.anim.fit = false;
        this.setPosition(SCREEN_CENTER_X, -SCREEN_CENTER_Y).setScale(0.0, 0.0);
        this.setInteractive(false);
        this.setBoundingType("circle");
        this.orgR = 4;
        this.radius = this.orgR;
        this.anim.gotoAndPlay("stand");
        this.rsoFlag = true;
        this.rsoMile = 0;
        this.isStop = false;
    },

    update: function (app) {
        if ((gameMode != GAME_MODE.START_INIT) && (gameMode != GAME_MODE.START)) return;

        this.y += tommy.drink / 20.0;
        if (this.y >= SCREEN_CENTER_Y) {
            this.y >= SCREEN_CENTER_Y;
            this.isStop = true;
        }
        let scl = calcScale(this.y);
        if (scl <= 0.0) {
            this.setScale(0.0, 0.0);
        } else {
            this.setScale(scl * 2.0, scl * 2.0);
            this.radius = this.orgR * scl * 2.0;
        }

        this.rsoMile += tommy.drink / 20.0;
        if (this.rsoMile >= SCREEN_HEIGHT / 4) {
            let xx = this.rsoFlag ? SCREEN_WIDTH : 0;
            RoadSideObject(xx, (SCREEN_HEIGHT / 4) * 0).addChildTo(group0).setPosition(SCREEN_CENTER_X, SCREEN_HEIGHT * 0);
            this.rsoFlag = !this.rsoFlag;
            this.rsoMile = 0;
        }

        // Tommyとの衝突判定
        if (this.hitTestElement(tommy)) {
            SoundManager.play("goal_se");
            gameMode = GAME_MODE.GOAL_INIT;
        }
    },
});

/*
*/
phina.define("MiniYasu", {
    superClass: "Sprite",

    init: function (option) {
        this.superInit("yasu", 128, 128);
        this.anim = FrameAnimation('player_ss').attachTo(this);
        this.anim.fit = false;
        this.setPosition(SCREEN_WIDTH - (128 * 0.5), 128).setScale(0.5, 0.5);
        this.setInteractive(false);
        this.setBoundingType("circle");
        this.radius = 48;
        this.anim.gotoAndPlay("stand");
    },

    update: function (app) {
    },
});

/*
*/
phina.define("Ball", {
    superClass: "Sprite",

    init: function (id, posX, posY) {
        switch (id) {
            case 0:
                // 日本酒
                this.sprName = "ball0";
                this.seName = "coin_se";
                this.sprSize = 64;
                this.orgR = 32;
                this.dspScl = 2;
                this.drink = 1;
                this.spd = 8;
                break;
            case 1:
                // ビール
                this.sprName = "ball1";
                this.seName = "coin_se";
                this.sprSize = 64;
                this.orgR = 32;
                this.dspScl = 2;
                this.drink = 1;
                this.spd = 9;
                break;
            case 2:
                // 発泡酒
                this.sprName = "ball2";
                this.seName = "coin_se";
                this.sprSize = 64;
                this.orgR = 32;
                this.dspScl = 2;
                this.drink = 0.5;
                this.spd = 10;
                break;
            case 3:
                // 焼酎
                this.sprName = "ball3";
                this.seName = "coin_se";
                this.sprSize = 64;
                this.orgR = 32;
                this.dspScl = 2;
                this.drink = 5;
                this.spd = 5;
                break;
            case 4:
                // 昆布茶
                this.sprName = "ball4";
                this.seName = "miss_se";
                this.sprSize = 64;
                this.orgR = 32;
                this.dspScl = 2;
                this.drink = 0;
                this.spd = 10;
                break;
        }
        this.superInit(this.sprName, this.sprSize, this.sprSize);
        this.setInteractive(false);
        this.setBoundingType("circle");
        this.radius = this.orgR;
        this.setPosition(posX, posY).setScale(1, 1);
        this.orgX = posX;
        this.orgY = posY;
        this.isMove = false;
        this.isDead = false;
    },

    update: function (app) {
        if (gameMode != GAME_MODE.START) return;

        if (this.isMove === false) {
            this.orgX = utena.x;
            this.orgY = utena.y - 128 - this.sprSize;
            this.setPosition(this.orgX, this.orgY);
            let tmpScale = calcScale(this.y);
            this.x = ((this.orgX - SCREEN_WIDTH / 2) * tmpScale) + (SCREEN_WIDTH / 2);
            this.setScale(tmpScale * this.dspScl);
            return;
        }

        this.y -= this.spd;
        let tmpScale = calcScale(this.y);
        this.x = ((this.orgX - SCREEN_WIDTH / 2) * tmpScale) + (SCREEN_WIDTH / 2);
        this.setScale(tmpScale * this.dspScl);
        this.radius = this.orgR * tmpScale;

        // 画面上から消えた
        if (this.y <= 0) {
            this.isDead = true;
            this.remove();
            delete this;
            ballMag.push(ballReload.shift());
            if (ballReload.length === 0) {
                ballReload = shuffle([0, 1, 2, 0, 1, 2, 0, 1, 3, 4]);
            }
        }

        // Tommyとの衝突判定
        if (this.hitTestElement(tommy)) {
            SoundManager.play(this.seName);
            if (this.sprName === "ball4") {
                tommy.ratio = 0.0;
                tommy.drink = 0.0;
            } else {
                if (tommy.drink > 0) tommy.ratio += 0.5;
                else tommy.ratio = 1.0;
                tommy.drink += this.drink * tommy.ratio;
                if (tommy.drink >= 10) tommy.drink = 10;
            }
            tommy.dir = (Math.random() < 0.5) ? 1 : -1;   // -1:左 1:右

            this.isDead = true;
            this.remove();
            delete this;
            ballMag.push(ballReload.shift());
            if (ballReload.length === 0) {
                ballReload = shuffle([0, 1, 2, 0, 1, 2, 0, 1, 3, 4]);
            }
        }

    },
});

/*
 */
phina.define("MiniBall", {
    superClass: "Sprite",

    init: function (idx) {
        this.superInit("mini_ball", 32, 32);
        this.anim = FrameAnimation('mini_ball_ss').attachTo(this);
        this.anim.fit = false;
        this.setInteractive(false);
        this.setBoundingType("circle");
        this.setPosition(32, (SCREEN_HEIGHT - 256 - 80) - 64 * idx).setScale(2);
        this.idx = idx;
        this.id = ballMag[this.idx];;
        this.anim.gotoAndPlay("ball" + this.id);
    },

    update: function (app) {
        if (gameMode != GAME_MODE.START) return;
        if (this.idx >= ballMag.length) {
            this.alpha = 0.0;
            return;
        }
        this.alpha = 1.0;
        let now = ballMag[this.idx];
        if (this.id === now) return;
        this.id = now;
        this.anim.gotoAndPlay("ball" + this.id);
    },
});

/*
*/
phina.define("RoadSideObject", {
    superClass: "Sprite",

    init: function (xx, yy) {
        this.sprName = "rso0";
        this.sprSize = 128;
        this.superInit(this.sprName, 72, 256);
        this.setInteractive(false);
        let scl = calcScale(this.y);
        this.orgX = xx;
        this.setPosition(xx, yy).setScale(scl);
    },

    update: function (app) {
        if ((gameMode != GAME_MODE.START_INIT) && (gameMode != GAME_MODE.START)) return;
        if (Yasu.isStop) return;

        this.y += tommy.drink / 20.0;
        let scl = calcScale(this.y);
        this.x = ((this.orgX - SCREEN_WIDTH / 2) * scl) + (SCREEN_WIDTH / 2);
        if (scl <= 0.0) scl = 0.0;
        if (scl >= 1.0) scl = 1.0;
        this.setScale(scl * 4.0);
    },
});

/*
*/
phina.define("DrinkGauge", {
    superClass: "PathShape",

    // 初期化
    init: function (options) {
        this.superInit(options);
    },

    update: function (app) {
        if (gameMode != GAME_MODE.START) return;

        let yPos = (SCREEN_HEIGHT - 544) * (tommy.drink / 10.0);
        if (yPos < 1) yPos = 1;
        this.changePath(0, -24, -yPos);    // 左上
        this.changePath(1, +24, -yPos);    // 右上
    },
});
/*
 */
phina.define("DrinkIcon", {
    superClass: "Sprite",

    init: function () {
        this.superInit("ball0", 64, 64);
        this.setInteractive(false);
        this.setPosition(SCREEN_WIDTH - 64, SCREEN_HEIGHT - 336 - 32).setScale(1.5);
    },

    update: function (app) {
        if ((gameMode != GAME_MODE.START_INIT) && (gameMode != GAME_MODE.START)) return;

        this.y = ((SCREEN_HEIGHT - 336) - (SCREEN_HEIGHT - 544) * (tommy.drink / 10.0)) - 32;
    },
});


function clearArrays() {
    if (group0 != null) group0.children.clear();
    if (group1 != null) group1.children.clear();
    if (group2 != null) group2.children.clear();
    if (group3 != null) group3.children.clear();
    if (group4 != null) group4.children.clear();
    if (group5 != null) group5.children.clear();
}

// 指定の範囲で乱数を求める
// ※start < end
// ※startとendを含む
function myRandom(start, end) {
    if (randomMode) {
        let max = (end - start) + 1;
        return Math.floor(Math.random() * Math.floor(max)) + start;
    } else {
        let mod = (end - start) + 1;
        randomSeed = (randomSeed * 5) + 1;
        for (; ;) {
            if (randomSeed < 2147483647) break;
            randomSeed -= 2147483647;
        }
        return (randomSeed % mod) + start;
    }
}

// ２点間の距離を求める
function calcDist(aX, aY, bX, bY) {
    return Math.sqrt(Math.pow(aX - bX, 2) + Math.pow(aY - bY, 2));
}

function calcScale(posY) {
    let scale = (posY / (1920 - 96));
    if (scale <= 0) scale = 0;
    return scale;
}

// フレーム数からhh:mm:ss.msに変換する
function framesToHMS(frames) {
    const totalMilliseconds = Math.floor((frames / FPS) * 1000);

    const hh = Math.floor(totalMilliseconds / (3600 * 1000));
    const mm = Math.floor((totalMilliseconds % (3600 * 1000)) / (60 * 1000));
    const ss = Math.floor((totalMilliseconds % (60 * 1000)) / 1000);
    const ms = totalMilliseconds % 1000;

    return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

// 与えられた配列をシャッフルする
function shuffle(array) {
    for (let ii = array.length - 1; ii > 0; ii--) {
        const jj = Math.floor(Math.random() * (ii + 1));
        [array[ii], array[jj]] = [array[jj], array[ii]];
    }
    return array;
}
