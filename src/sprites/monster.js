import Phaser from "phaser";

const ScoreMap = [1, 5, 25, 150];

export class Monster extends Phaser.GameObjects.Sprite {
    /** @type {string} */
    mark = '';
    /** @type {number} */
    level = 1;
    /** @type {boolean} */
    isFalling = false;
    /**
     * @param {Phaser.Scene} scene The scene this sprite belongs to.
     * @param {number} x The x-coordinate of the sprite.
     * @param {number} y The y-coordinate of the sprite.
     * @param {string | Array<string> } [mark] The animation to play when the sprite is created.
     */
    constructor(scene, x, y, mark) {
        super(scene, x, y, '');
        scene.add.existing(this);
        this.setOrigin(0.5);
        if (mark.constructor === Array) {
            mark = mark[Math.floor(Math.random() * mark.length)];
        }
        if (mark) {
            this.mark = mark;
            this.setLevel(1);
        }
    }

    setLevel(level) {
        this.level = level;
        this.play(`${this.mark}${this.level}`);
    }

    levelUp() {
        this.setLevel(this.level + 1);
    }

    equals(monster) {
        return this.mark === monster.mark && this.level === monster.level;
    }

    canFall() {
        return !this.isFalling && this.mark;
    }

    getScore() {
        return ScoreMap[(this.level - 1) % 4] * Math.pow(1000, Math.floor((this.level - 1) / 4));
    }
}
