// 日语记忆卡片应用
class JapaneseFlashcards {
    constructor() {
        this.cards = [];
        this.currentIndex = 0;
        this.isFlipped = false;
        this.pendingCards = [];
        this.stats = {
            totalStudied: 0,
            mastered: 0,
            correctCount: 0,
            totalAttempts: 0,
            history: []
        };
        
        this.init();
    }

    init() {
        // 清除旧的本地存储数据，使用新的示例卡片
        localStorage.removeItem('japaneseFlashcards');
        localStorage.removeItem('japaneseFlashcardsStats');
        
        // 强制添加新的示例卡片
        this.addSampleCards();
        
        this.loadData();
        this.bindEvents();
        this.updateUI();
    }

    // 绑定事件
    bindEvents() {
        // 标签切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // 卡片翻转
        const flipCard = document.getElementById('flip-card');
        const flipBtn = document.getElementById('flip-btn');
        
        flipCard.addEventListener('click', () => this.flipCard());
        flipBtn.addEventListener('click', () => this.flipCard());

        // 导航按钮
        document.getElementById('prev-btn').addEventListener('click', () => this.prevCard());
        document.getElementById('next-btn').addEventListener('click', () => this.nextCard());

        // 卡片管理事件
        document.getElementById('search-btn').addEventListener('click', () => this.updateCardsList());
        document.getElementById('card-search').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                this.updateCardsList();
            }
        });
        document.getElementById('card-category-filter').addEventListener('change', () => this.updateCardsList());
        document.getElementById('refresh-cards-btn').addEventListener('click', () => this.updateCardsList());
        document.getElementById('select-all-btn').addEventListener('click', () => this.toggleSelectAll());
        document.getElementById('batch-delete-btn').addEventListener('click', () => this.batchDelete());



        // 难度按钮
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.recordDifficulty(e.target.dataset.difficulty);
            });
        });

        // 随机排序
        document.getElementById('shuffle-btn').addEventListener('click', () => this.shuffleCards());

        // 类别筛选
        document.getElementById('category-filter').addEventListener('change', (e) => {
            this.filterByCategory(e.target.value);
        });

        // 导入标签切换
        document.querySelectorAll('.import-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchImportTab(e.target.dataset.import));
        });

        // 文件上传
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');

        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            this.handleFileUpload(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.handleFileUpload(e.target.files[0]);
            }
        });

        // 格式标签切换
        document.querySelectorAll('.format-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.format-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.format-content').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById(e.target.dataset.format + '-format').classList.add('active');
            });
        });

        // 手动添加卡片
        document.getElementById('add-card-btn').addEventListener('click', () => this.addPendingCard());
        document.getElementById('save-manual-btn').addEventListener('click', () => this.savePendingCards());

        // 统计页面按钮
        document.getElementById('reset-stats-btn').addEventListener('click', () => this.resetStats());
        document.getElementById('export-data-btn').addEventListener('click', () => this.exportData());

        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    // 切换标签
    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-section`).classList.add('active');

        if (tabName === 'stats') {
            this.updateStats();
        } else if (tabName === 'cards') {
            this.updateCardsList();
        }
    }

    // 切换导入标签
    switchImportTab(tabName) {
        document.querySelectorAll('.import-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.import-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-import="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-import`).classList.add('active');
    }

    // 翻转卡片
    flipCard() {
        const flipCard = document.getElementById('flip-card');
        this.isFlipped = !this.isFlipped;
        flipCard.classList.toggle('flipped', this.isFlipped);
    }

    // 上一张卡片
    prevCard() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.resetCard();
            this.updateCard();
        }
    }

    // 下一张卡片
    nextCard() {
        if (this.currentIndex < this.cards.length - 1) {
            this.currentIndex++;
            this.resetCard();
            this.updateCard();
        }
    }

    // 重置卡片状态
    resetCard() {
        this.isFlipped = false;
        document.getElementById('flip-card').classList.remove('flipped');
    }

    // 更新卡片显示
    updateCard() {
        if (this.cards.length === 0) return;

        const card = this.cards[this.currentIndex];
        document.getElementById('card-front').textContent = card.front;
        document.getElementById('card-back').textContent = card.back;
        document.getElementById('card-category').textContent = card.category || '未分类';
        document.getElementById('card-category-back').textContent = card.category || '未分类';
        document.getElementById('card-example').textContent = card.example ? `例句：${card.example}` : '';

        // 更新进度
        const progress = ((this.currentIndex + 1) / this.cards.length) * 100;
        document.getElementById('progress-text').textContent = `第 ${this.currentIndex + 1} / ${this.cards.length} 张`;
        document.getElementById('progress-fill').style.width = `${progress}%`;
    }

    // 记录难度
    recordDifficulty(difficulty) {
        const card = this.cards[this.currentIndex];
        
        // 更新卡片难度统计
        if (!card.difficulty) card.difficulty = {};
        card.difficulty[difficulty] = (card.difficulty[difficulty] || 0) + 1;
        
        // 更新总体统计
        this.stats.totalAttempts++;
        if (difficulty === 'easy') {
            this.stats.correctCount++;
            card.mastered = true;
        }
        
        // 添加历史记录
        this.stats.history.unshift({
            date: new Date().toISOString(),
            action: `学习卡片: ${card.front} - ${difficulty === 'easy' ? '掌握' : difficulty === 'medium' ? '一般' : '困难'}`
        });

        this.saveData();
        
        // 自动跳到下一张
        setTimeout(() => {
            if (this.currentIndex < this.cards.length - 1) {
                this.nextCard();
            } else {
                alert('恭喜！你已经完成了所有卡片的学习！');
            }
        }, 500);
    }

    // 随机排序
    shuffleCards() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
        this.currentIndex = 0;
        this.resetCard();
        this.updateCard();
    }

    // 按类别筛选
    filterByCategory(category) {
        if (category === 'all') {
            this.currentIndex = 0;
        } else {
            const index = this.cards.findIndex(card => card.category === category);
            if (index !== -1) {
                this.currentIndex = index;
            }
        }
        this.resetCard();
        this.updateCard();
    }

    // 处理文件上传
    handleFileUpload(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const extension = file.name.split('.').pop().toLowerCase();
            
            try {
                let newCards = [];
                if (extension === 'json') {
                    newCards = JSON.parse(content);
                } else if (extension === 'csv') {
                    newCards = this.parseCSV(content);
                }

                if (Array.isArray(newCards) && newCards.length > 0) {
                    this.cards = [...this.cards, ...newCards];
                    this.saveData();
                    this.updateCategoryFilter();
                    alert(`成功导入 ${newCards.length} 张卡片！`);
                    this.switchTab('study');
                } else {
                    alert('文件格式不正确或没有有效数据');
                }
            } catch (error) {
                alert('文件解析失败：' + error.message);
            }
        };
        reader.readAsText(file);
    }

    // 解析CSV
    parseCSV(content) {
        // 移除BOM（字节顺序标记）
        content = content.replace(/^\ufeff/, '');
        
        const lines = content.trim().split('\n');
        if (lines.length < 2) {
            return [];
        }
        
        // 自动检测分隔符
        const firstLine = lines[0];
        let delimiter = ',';
        if (firstLine.includes(';')) {
            delimiter = ';';
        } else if (firstLine.includes('\t')) {
            delimiter = '\t';
        }
        
        const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
        const cards = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split(delimiter).map(v => v.trim());
            const card = {};
            
            // 简单处理：第一列作为正面，第二列作为反面
            if (values.length >= 2) {
                card.front = values[0];
                card.back = values[1];
                // 可选：第三列作为类别，第四列作为例句
                if (values.length >= 3) {
                    card.category = values[2];
                }
                if (values.length >= 4) {
                    card.example = values[3];
                }
                cards.push(card);
            }
        }

        return cards;
    }

    // 添加待处理卡片
    addPendingCard() {
        const front = document.getElementById('manual-front').value.trim();
        const back = document.getElementById('manual-back').value.trim();
        const category = document.getElementById('manual-category').value.trim();
        const example = document.getElementById('manual-example').value.trim();

        if (!front || !back) {
            alert('请填写正面和背面内容');
            return;
        }

        this.pendingCards.push({ front, back, category: category || '未分类', example });
        this.updatePendingList();
        
        // 清空输入
        document.getElementById('manual-front').value = '';
        document.getElementById('manual-back').value = '';
        document.getElementById('manual-category').value = '';
        document.getElementById('manual-example').value = '';
        document.getElementById('manual-front').focus();
    }

    // 更新待处理列表
    updatePendingList() {
        const container = document.getElementById('pending-cards');
        container.innerHTML = this.pendingCards.map((card, index) => `
            <div class="pending-card-item">
                <div class="pending-card-info">
                    <div class="pending-card-front">${card.front}</div>
                    <div class="pending-card-back">${card.back}</div>
                </div>
                <button class="delete-pending-btn" onclick="app.deletePendingCard(${index})">删除</button>
            </div>
        `).join('');
    }

    // 删除待处理卡片
    deletePendingCard(index) {
        this.pendingCards.splice(index, 1);
        this.updatePendingList();
    }

    // 保存待处理卡片
    savePendingCards() {
        if (this.pendingCards.length === 0) {
            alert('没有待添加的卡片');
            return;
        }

        this.cards = [...this.cards, ...this.pendingCards];
        this.pendingCards = [];
        this.saveData();
        this.updateCategoryFilter();
        this.updatePendingList();
        alert(`成功添加 ${this.pendingCards.length} 张卡片！`);
        this.switchTab('study');
    }

    // 更新类别筛选器
    updateCategoryFilter() {
        const categories = [...new Set(this.cards.map(card => card.category).filter(Boolean))];
        const select = document.getElementById('category-filter');
        select.innerHTML = '<option value="all">全部类别</option>' +
            categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }

    // 更新统计
    updateStats() {
        const mastered = this.cards.filter(c => c.mastered).length;
        const accuracy = this.stats.totalAttempts > 0 
            ? Math.round((this.stats.correctCount / this.stats.totalAttempts) * 100) 
            : 0;

        document.getElementById('total-cards').textContent = this.cards.length;
        document.getElementById('mastered-cards').textContent = mastered;
        document.getElementById('studied-cards').textContent = this.stats.totalStudied;
        document.getElementById('accuracy-rate').textContent = `${accuracy}%`;

        // 类别统计
        const categoryCount = {};
        this.cards.forEach(card => {
            const cat = card.category || '未分类';
            categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });

        const categoryList = document.getElementById('category-list');
        categoryList.innerHTML = Object.entries(categoryCount)
            .map(([name, count]) => `
                <div class="category-item">
                    <span class="category-name">${name}</span>
                    <span class="category-count">${count} 张</span>
                </div>
            `).join('');

        // 历史记录
        const historyList = document.getElementById('history-list');
        if (this.stats.history.length === 0) {
            historyList.innerHTML = '<div class="empty-state"><p>暂无学习记录</p></div>';
        } else {
            historyList.innerHTML = this.stats.history.slice(0, 20).map(h => {
                const date = new Date(h.date);
                return `
                    <div class="history-item">
                        <span class="history-action">${h.action}</span>
                        <span class="history-date">${date.toLocaleString('zh-CN')}</span>
                    </div>
                `;
            }).join('');
        }
    }

    // 重置统计
    resetStats() {
        if (confirm('确定要重置所有统计数据吗？卡片数据将保留。')) {
            this.stats = {
                totalStudied: 0,
                mastered: 0,
                correctCount: 0,
                totalAttempts: 0,
                history: []
            };
            this.cards.forEach(card => {
                delete card.mastered;
                delete card.difficulty;
            });
            this.saveData();
            this.updateStats();
        }
    }

    // 导出数据
    exportData() {
        const data = {
            cards: this.cards,
            stats: this.stats,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `日语记忆卡片_${new Date().toLocaleDateString('zh-CN')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // 键盘快捷键
    handleKeyboard(e) {
        // 只在学习模式下响应
        if (!document.getElementById('study-section').classList.contains('active')) return;

        switch(e.key) {
            case ' ':
            case 'Enter':
                e.preventDefault();
                this.flipCard();
                break;
            case 'ArrowLeft':
                this.prevCard();
                break;
            case 'ArrowRight':
                this.nextCard();
                break;
            case '1':
                if (this.isFlipped) this.recordDifficulty('hard');
                break;
            case '2':
                if (this.isFlipped) this.recordDifficulty('medium');
                break;
            case '3':
                if (this.isFlipped) this.recordDifficulty('easy');
                break;
        }
    }

    // 添加示例卡片
    addSampleCards() {
        const sampleCards = [
            { front: '集中豪雨', back: '特大暴雨', category: '气象', example: '最近集中豪雨が多いです。' },
            { front: 'あくびをする', back: '打哈欠', category: '动作', example: '朝はあくびをしながら起きます。' },
            { front: '口は災いの元', back: '祸从口出', category: '谚语', example: '口は災いの元と言われています。' },
            { front: 'ノービザ政策', back: '免签', category: '政策', example: '日本へのノービザ政策が始まりました。' },
            { front: 'フェミニスト', back: '女权主义者', category: '社会', example: '彼女はフェミニストです。' },
            { front: '高所得層', back: '高收入人群', category: '社会', example: '高所得層は税金を多く払います。' },
            { front: '高級品', back: '名牌商品', category: '物品', example: '高級品は高いです。' },
            { front: 'きりがない', back: '没完没了', category: '形容词', example: '作業がきりがないです。' },
            { front: 'デジタル通貨', back: '数字货币', category: '金融', example: 'ビットコインはデジタル通貨の一種です。' },
            { front: '世界的・グローバル的', back: '全球的', category: '形容词', example: 'これは世界的な問題です。' },
            { front: '即辞職', back: '闪辞', category: '职场', example: '彼は即辞職しました。' },
            { front: '親子旅行', back: '亲子游', category: '生活', example: '夏休みに親子旅行に行きます。' },
            { front: '電気バイク', back: '电动车', category: '交通', example: '電気バイクは環境に優しいです。' },
            { front: 'フリーランス', back: '自由职业者', category: '职场', example: '彼はフリーランスとして働いています。' },
            { front: '訳アリ品', back: '瑕疵品', category: '物品', example: 'これは訳アリ品です。' },
            { front: '小町', back: '常指代美人，可意译为西施', category: '文化', example: '彼女は小町のような美人です。' },
            { front: '棚から牡丹餅', back: '天上掉馅饼', category: '谚语', example: 'そんな幸せは棚から牡丹餅です。' },
            { front: 'でっち上げ', back: '捏造', category: '行为', example: '彼はでっち上げた話をしました。' }
        ];
        
        this.cards = sampleCards;
        this.saveData();
        this.updateCategoryFilter();
    }

    // 保存数据到本地存储
    saveData() {
        localStorage.setItem('japaneseFlashcards', JSON.stringify(this.cards));
        localStorage.setItem('japaneseFlashcardsStats', JSON.stringify(this.stats));
    }

    // 从本地存储加载数据
    loadData() {
        const savedCards = localStorage.getItem('japaneseFlashcards');
        const savedStats = localStorage.getItem('japaneseFlashcardsStats');
        
        if (savedCards) {
            this.cards = JSON.parse(savedCards);
        }
        if (savedStats) {
            this.stats = JSON.parse(savedStats);
        }
        
        this.updateCategoryFilter();
    }

    // 更新卡片管理列表
    updateCardsList() {
        const cardsList = document.getElementById('cards-list');
        const searchTerm = document.getElementById('card-search').value.toLowerCase();
        const categoryFilter = document.getElementById('card-category-filter').value;
        
        let filteredCards = this.cards;
        
        // 搜索过滤
        if (searchTerm) {
            filteredCards = filteredCards.filter(card => 
                card.front.toLowerCase().includes(searchTerm) || 
                card.back.toLowerCase().includes(searchTerm) ||
                (card.category && card.category.toLowerCase().includes(searchTerm))
            );
        }
        
        // 类别过滤
        if (categoryFilter !== 'all') {
            filteredCards = filteredCards.filter(card => card.category === categoryFilter);
        }
        
        // 生成卡片列表
        if (filteredCards.length === 0) {
            cardsList.innerHTML = '<div class="empty-state">没有找到卡片</div>';
        } else {
            cardsList.innerHTML = filteredCards.map((card, index) => `
                <div class="card-item">
                    <div class="card-item-checkbox">
                        <input type="checkbox" class="card-checkbox" data-index="${index}">
                    </div>
                    <div class="card-item-content">
                        <div class="card-item-front">${card.front}</div>
                        <div class="card-item-back">${card.back}</div>
                        ${card.category ? `<div class="card-item-category">${card.category}</div>` : ''}
                    </div>
                    <div class="card-item-actions">
                        <button class="btn-edit" onclick="app.editCard(${index})">编辑</button>
                        <button class="btn-delete" onclick="app.deleteCard(${index})">删除</button>
                    </div>
                </div>
            `).join('');
            
            // 添加复选框事件监听
            this.bindCardCheckboxes();
        }
        
        // 更新类别过滤器
        this.updateCardCategoryFilter();
        // 重置批量删除按钮状态
        this.updateBatchDeleteButton();
    }
    
    // 绑定卡片复选框事件
    bindCardCheckboxes() {
        document.querySelectorAll('.card-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateBatchDeleteButton();
            });
        });
    }
    
    // 更新批量删除按钮状态
    updateBatchDeleteButton() {
        const checkboxes = document.querySelectorAll('.card-checkbox:checked');
        const batchDeleteBtn = document.getElementById('batch-delete-btn');
        batchDeleteBtn.disabled = checkboxes.length === 0;
    }
    
    // 全选/取消全选
    toggleSelectAll() {
        const selectAllBtn = document.getElementById('select-all-btn');
        const checkboxes = document.querySelectorAll('.card-checkbox');
        const allChecked = selectAllBtn.textContent === '取消全选';
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
        });
        
        selectAllBtn.textContent = allChecked ? '全选' : '取消全选';
        this.updateBatchDeleteButton();
    }
    
    // 批量删除
    batchDelete() {
        const checkboxes = document.querySelectorAll('.card-checkbox:checked');
        const indices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index));
        
        if (indices.length === 0) return;
        
        if (confirm(`确定要删除选中的 ${indices.length} 张卡片吗？`)) {
            // 按索引从大到小排序，避免删除时索引变化
            indices.sort((a, b) => b - a).forEach(index => {
                this.cards.splice(index, 1);
            });
            
            this.saveData();
            this.updateCardsList();
            alert(`成功删除 ${indices.length} 张卡片`);
        }
    }

    // 更新卡片管理页面的类别过滤器
    updateCardCategoryFilter() {
        const filter = document.getElementById('card-category-filter');
        const categories = [...new Set(this.cards.map(card => card.category).filter(Boolean))];
        
        filter.innerHTML = '<option value="all">全部类别</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            filter.appendChild(option);
        });
    }

    // 编辑卡片
    editCard(index) {
        const card = this.cards[index];
        const front = prompt('请输入卡片正面:', card.front);
        const back = prompt('请输入卡片背面:', card.back);
        
        if (front && back) {
            card.front = front;
            card.back = back;
            this.saveData();
            this.updateCardsList();
            alert('卡片已更新');
        }
    }

    // 删除卡片
    deleteCard(index) {
        if (confirm('确定要删除这张卡片吗？')) {
            this.cards.splice(index, 1);
            this.saveData();
            this.updateCardsList();
            alert('卡片已删除');
        }
    }

    // 更新UI
    updateUI() {
        this.updateCard();
    }
}

// 初始化应用
const app = new JapaneseFlashcards();
