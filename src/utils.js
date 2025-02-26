import { Monster } from "./sprites/monster";

export class UnionFind {
    parent;
    rank;

    constructor(n) {
        this.parent = Array(n).fill(0).map((_, i) => i);
        this.rank = Array(n).fill(1);
    }

    find(x) {
        if (this.parent[x] !== x) {
            this.parent[x] = this.find(this.parent[x]); // 路径压缩
        }
        return this.parent[x];
    }

    union(x, y) {
        const rootX = this.find(x);
        const rootY = this.find(y);
        if (rootX === rootY) return;

        // 按秩合并
        if (this.rank[rootX] < this.rank[rootY]) {
            this.parent[rootX] = rootY;
        } else {
            this.parent[rootY] = rootX;
            if (this.rank[rootX] === this.rank[rootY]) {
                this.rank[rootX]++;
            }
        }
    }
}

/**
 * 
 * @param {Monster} board 
 * @param {number} rows 
 * @param {number} cols 
 * @returns 
 */
export function findMatches(board, rows, cols) {
    const directions = [
        { dr: 0, dc: 1 },  // 右
        { dr: 1, dc: 1 },  // 右下
        { dr: 1, dc: 0 },  // 下
        { dr: 1, dc: -1 }, // 左下
        { dr: 0, dc: -1 }, // 左
        { dr: -1, dc: -1 },// 左上
        { dr: -1, dc: 0 }, // 上
        { dr: -1, dc: 1 }  // 右上
    ];

    // 初始化并查集
    const totalNodes = rows * cols;
    const uf = new UnionFind(totalNodes);

    // 第一步：检查8个方向，标记三连相同为联通
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const current = board[row][col];
            if (!current || current.mark === '') continue;

            const currentIdx = row * cols + col;

            // 检查8个方向
            for (const dir of directions) {
                const prevRow = row - dir.dr;
                const prevCol = col - dir.dc;
                const nextRow = row + dir.dr;
                const nextCol = col + dir.dc;

                // 检查相反两个方向的棋子是否相同
                if (
                    prevRow >= 0 && prevRow < rows &&
                    prevCol >= 0 && prevCol < cols &&
                    nextRow >= 0 && nextRow < rows &&
                    nextCol >= 0 && nextCol < cols
                ) {
                    const prevMonster = board[prevRow][prevCol];
                    const nextMonster = board[nextRow][nextCol];

                    if (prevMonster?.equals(current) && nextMonster?.equals(current)) {
                        // 标记三个棋子为联通
                        const prevIdx = prevRow * cols + prevCol;
                        const nextIdx = nextRow * cols + nextCol;
                        uf.union(currentIdx, prevIdx);
                        uf.union(currentIdx, nextIdx);
                    }
                }
            }
        }
    }

    // 第二步：收集所有联通区域
    const groups = new Map();
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const current = this.monsters[row][col];
            if (!current || current.mark === '') continue;

            const idx = row * cols + col;
            const root = uf.find(idx);

            if (!groups.has(root)) {
                groups.set(root, []);
            }
            groups.get(root).push({ row, col });
        }
    }

    // 返回所有联通区域
    return Array.from(groups.values()).filter(group => group.length >= 3);
}