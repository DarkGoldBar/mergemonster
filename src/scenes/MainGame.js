import { Scene } from 'phaser';
import { Block } from '../sprites/block';
import { Monster } from '../sprites/monster';
import { findMatches } from '../utils';


const marginTop = 150;
const marginLeft = 50;
const marginGap = 10;

export class MainGame extends Scene {
    /** @type {number} */
    boardrows = 0;
    /** @type {number} */
    boardcols = 0;
    /** @type {number} */
    _score = 0;
    /** @type {number} */
    _steps = 1;
    /** @type {string[][]} */
    board;
    /** @type {Block[][]} */
    blocks;
    /** @type {Monster[][]} */
    monsters;

    alignConfig = {
        width: 1,
        height: 1,
        cellWidth: 10,
        cellHeight: 10,
        x: marginLeft,
        y: marginTop,
        position: Phaser.Display.Align.CENTER
    };

    example_data = {
        board: 'XXXXX|XXXXX|XX XX|XXXXX|XXXXX',
        monsters: ['star', 'crystal', 'orb'],
        steps: 20;
    };

    constructor() {
        super('MainGame');
    }

    createBoard(data) {
        data = data ?? this.example_data;
        this.board = data.board.split('|');
        this.boardrows = this.board.length;
        this.boardcols = this.board[0].length;
        this._steps = data.steps;
        this._score = 0;
        this.blocks = [];
        this.monsters = [];
        for (let i = 0; i < this.boardrows; i++) {
            this.blocks[i] = [];
            this.monsters[i] = [];
            for (let j = 0; j < this.boardcols; j++) {
                if (this.board[i][j] == ' ') {
                    this.blocks[i][j] = new Block(this, 0, 0, '');
                    this.monsters[i][j] = new Monster(this, 0, 0, '');
                } else {
                    this.blocks[i][j] = new Block(this, 0, 0, 'X');
                    this.monsters[i][j] = new Monster(this, 0, 0, data.monsters);
                }
            }
        }
        this.g_blocks = this.add.group(this.blocks.flat());
        this.g_monsters = this.add.group(this.monsters.flat());
        this.g_blocks.setDepth(0);
        this.g_monsters.setDepth(1);

        this.alignConfig.width = this.boardcols;
        this.alignConfig.height = this.boardrows,
        this.alignConfig.cellWidth = (this.scale.width - 2 * marginLeft) / this.boardcols;
        this.alignConfig.cellHeight = this.alignConfig.cellWidth;

        Phaser.Actions.GridAlign(this.g_blocks.getChildren(), alignConfig);
        Phaser.Actions.GridAlign(this.g_monsters.getChildren(), alignConfig);
    }

    setupMonsterDrag(monster) {
        if (!monster.mark) return;
        monster.setInteractive();
        this.input.setDraggable(monster);

        monster.on('dragstart', () => {
            monster.dragStartX = monster.x;
            monster.dragStartY = monster.y;
            monster.setAlpha(0.8);
            this.children.bringToTop(monster);
        });

        monster.on('drag', (pointer, dragX, dragY) => {
            monster.x = dragX;
            monster.y = dragY;
        });

        monster.on('dragend', () => {
            monster.setAlpha(1);
            const startGrid = this.getGridPosition(monster.dragStartX, monster.dragStartY);
            const endGrid = this.getGridPosition(monster.x, monster.y);
            if (startGrid && endGrid) {
                this.monsters.flat().forEach(m => m.disableInteractive());
                this.steps--;
                this.swapMonsters(startGrid, endGrid);
                this.events.emit("match");
            } else {
                monster.x = monster.dragStartX;
                monster.y = monster.dragStartY;
            }
        });
    }

    getGridPosition(x, y) {
        const alignConfig = this.alignConfig;

        // 计算行列
        const col = Math.round((x - alignConfig.x - alignConfig.cellWidth / 2) / alignConfig.cellWidth);
        const row = Math.round((y - alignConfig.y - alignConfig.cellHeight / 2) / alignConfig.cellHeight);

        // 检查边界
        if (
            row >= 0 && row < this.boardrows &&
            col >= 0 && col < this.boardcols &&
            this.board[row][col] !== ' ' // 排除空格子
        ) {
            return { row, col };
        }
        return null;
    }

    swapMonsters(startPos, endPos) {
        // 动画移动
        const monsterA = this.monsters[startPos.row][startPos.col];
        const monsterB = this.monsters[endPos.row][endPos.col];
        const blockA = this.blocks[startPos.row][startPos.col];
        const blockB = this.blocks[endPos.row][endPos.col];
        // 为 monsterA 创建动画
        this.tweens.add({
            targets: monsterA,
            x: blockB.x,
            y: blockB.y,
            duration: 200,
            ease: 'Power2'
        });
        // 为 monsterB 创建动画
        this.tweens.add({
            targets: monsterB,
            x: blockA.x,
            y: blockA.y,
            duration: 200,
            ease: 'Power2'
        });
        // 交换数组中的引用
        [this.monsters[startPos.row][startPos.col],
        this.monsters[endPos.row][endPos.col]] =
            [this.monsters[endPos.row][endPos.col],
            this.monsters[startPos.row][startPos.col]];
    }

    /**
     * @param {Array<{row: number, col: number}>[]} groups  Array of groups of positions that are connected
     * @param {Array<{row: number, col: number}>} [centers]  Array of centers positions that are reserved
     * @returns {Promise<void>}
     */
    async removeMatches(groups, centers = []) {
        const removePromises = [];
        groups.forEach(group => {
            // 步骤1：寻找符合条件的中心点
            let center = null;

            // 1.1 检查是否存在预设中心点
            const presetCenter = group.find(pos =>
                centers.some(c => c.row === pos.row && c.col === pos.col)
            );

            // 1.2 存在预设中心点则直接使用
            if (presetCenter) {
                center = presetCenter;
            }
            // 1.3 否则计算几何中心
            else {
                // 计算几何中心坐标
                const avgRow = group.reduce((sum, pos) => sum + pos.row, 0) / group.length;
                const avgCol = group.reduce((sum, pos) => sum + pos.col, 0) / group.length;

                // 寻找最接近几何中心的棋子
                let minDistance = Infinity;
                group.forEach(pos => {
                    const dx = pos.row - avgRow;
                    const dy = pos.col - avgCol;
                    const distance = dx * dx + dy * dy; // 使用平方距离避免开根号

                    if (distance < minDistance) {
                        minDistance = distance;
                        center = pos;
                    }
                });
            }

            // 步骤2：执行消除逻辑
            if (center) {
                const centerMonster = this.monsters[center.row][center.col];
                const centerBlock = this.blocks[center.row][center.col];
                const targets = group.filter(pos => pos !== center);

                // 2.1 播放移动动画
                const toDestory = targets.map(pos => this.monsters[pos.row][pos.col]);
                targets.forEach(pos => this.monsters[pos.row][pos.col] = null);
                const promise = new Promise(resolve => this.tweens.add({
                    targets: toDestory,
                    x: centerBlock.x,
                    y: centerBlock.y,
                    duration: 500,
                    ease: 'Power2',
                    onComplete: () => {
                        toDestory.forEach(monster => {
                            this.addScore(monster.getScore());
                            monster.destroy();
                        });
                        centerMonster.levelUp();
                        centerMonster.setPosition(centerBlock.x, centerBlock.y);
                        resolve();
                    }
                }));
                removePromises.push(promise);
            }
        });
        await Promise.all(removePromises);
    }

    async fallDownMonsters() {
        const cols = this.boardcols;
        const rows = this.boardrows;
        const fallData = [];

        // 按列处理（从左到右）
        for (let col = 0; col < cols; col++) {
            let virtualCount = 0; // 记录当前列虚值数量

            // 从下往上遍历每列
            for (let destRow = rows - 1; destRow >= 0; destRow--) {
                const destBlock = this.blocks[destRow][col];
                if (!destBlock.available()) continue; // 跳过不可用格子

                let foundMonster = null;
                let srcRow = destRow;

                // 向上寻找可下落的棋子
                while (srcRow >= 0) {
                    const monster = this.monsters[srcRow][col];
                    if (monster && monster.canFall()) {
                        foundMonster = monster;
                        break;
                    }
                    srcRow--;
                }

                if (foundMonster) {
                    // 记录下落路径
                    fallData.push({
                        srcPos: { row: srcRow, col },
                        destPos: { row: destRow, col },
                        monster: foundMonster
                    });
                    foundMonster.isFalling = true; // 标记防止重复使用
                } else {
                    // 标记虚值，后续生成新棋子
                    fallData.push({
                        srcPos: { row: -1 - virtualCount, col }, // 虚值坐标（如-1, -2...）
                        destPos: { row: destRow, col },
                        monster: null
                    });
                    virtualCount++;
                }
            }
        }

        console.log(fallData);

        // 生成虚值位置的新棋子
        const newMonsters = [];
        fallData.forEach(data => {
            if (data.monster === null) {
                // 随机选择新棋子的 mark
                const randomMark = this.example_data.monsters[
                    Math.floor(Math.random() * this.example_data.monsters.length)
                ];

                // 在虚值位置创建新棋子（实际在屏幕外）
                const newMonster = new Monster(
                    this,
                    this.blocks[0][data.destPos.col].x, // X 对齐目标列
                    this.blocks[data.destPos.row][data.destPos.col].y - 800, // 从上方掉落
                    randomMark
                );
                newMonsters.push(newMonster);
                data.monster = newMonster;
            }
        });
        // 等待所有下落 tween 完成
        await Promise.all(fallData.map(data => new Promise((resolve) => {
            this.tweens.add({
                targets: data.monster,
                x: this.blocks[data.destPos.row][data.destPos.col].x,
                y: this.blocks[data.destPos.row][data.destPos.col].y,
                duration: 800,
                ease: 'Bounce.Out',
                onComplete: () => {
                    this.monsters[data.destPos.row][data.destPos.col] = data.monster;
                    data.monster.isFalling = false;
                    resolve();
                }
            });
        })));
    }

    set score(num) {
        this._score = num;
    }

    get score() {
        return this._score;
    }

    set steps(num) {
        this._steps = num;
    }

    get steps() {
        return this._steps;
    }

    onMatch(combo=0) {
        const match = findMatches(this.monsters, this.boardcols, this.boardrows);
        if (match) {
            this.removeMatches(match, [endGrid, startGrid])
            .then(this.fallDownMonsters)
            .then(this.setupMonsterDrag)
            .then(() => {
                this.events.emit("match", combo + 1);
            });
    }

    create() {
        console.log(this);

        this.cameras.main.setBackgroundColor(0x00ff00);
        this.add.image(200, 400, 'background').setAlpha(0.5);

        this.createBoard();

        this.events.on("match", this.onMatch, this);

        this.monsters.flat().forEach(m => this.setupMonsterDrag(m));
    }
}
