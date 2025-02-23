import Phaser from "phaser";

export class Block extends Phaser.GameObjects.Sprite {
    mark = '';

    /**
     * @param {Phaser.Scene} scene The scene this sprite belongs to.
     * @param {number} x The x-coordinate of the sprite.
     * @param {number} y The y-coordinate of the sprite.
     * @param {string} mark The mark to display on the block.
     */
    constructor(scene, x, y, mark) {
        super(scene, x, y, 'block', 0);
        scene.add.existing(this);
        this.setOrigin(0.5);
        this.mark = mark;
        if (mark == 'X') {
            this.setFrame(1)
        }
    }

    available() {
        return this.mark == "X";
    }
}   
