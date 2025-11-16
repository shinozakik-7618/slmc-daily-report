// ===================================
// SLMC日次報告書作成アプリ - メインJavaScript
// マルチブロック対応版 v2.1.5
// ===================================

class DailyReportApp {
    constructor() {
        this.currentBlock = null;
        this.currentEditId = null;
        this.charts = {};
        this.currentReportText = '';
        this.blockNames = {
            east: '東ブロック',
            center: 'センターブロック',
            west: '西ブロック',
            dcl: 'DCL共通'
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadTodayDate();
        this.loadDataList();
        this.loadEmailList();
    }

    // イベントリスナー設定
    setupEventListeners() {
        // タブ切り替え
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // レポートタイプ切り替え
        document.querySelectorAll('.report-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchReportType(e.target.dataset.type));
        });

        // レポート生成
        document.getElementById('generateReport').addEventListener('click', () => this.generateReport());
        document.getElementById('downloadReport').addEventListener('click', () => this.downloadReport());
        document.getElementById('downloadCSV').addEventListener('click', () => this.downloadCSV());
        document.getElementById('sendEmail').addEventListener('click', () => this.openEmailModal());

        // データ検索
        document.getElementById('searchData').addEventListener('click', () => this.searchData());

        // 全データエクスポート
        document.getElementById('exportAllData').addEventListener('click', () => this.exportAllData());

        // 前日データコピー
        document.getElementById('copyPrevDay').addEventListener('click', () => this.copyPreviousDayData());

        // メール設定
        document.getElementById('addEmail').addEventListener('click', () => this.addEmailAddress());
        document.getElementById('sendEmailBtn').addEventListener('click', () => this.sendEmail());
        
        // データインポート
        document.getElementById('importData').addEventListener('click', () => this.openImportModal());
        document.getElementById('importFileInput').addEventListener('change', (e) => this.handleFileSelect(e));
        document.getElementById('executeImport').addEventListener('click', () => this.executeImport());
        
        // モーダル閉じるボタン
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal(btn.closest('.modal')));
        });
    }

    // 今日の日付を設定
    loadTodayDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('dailyReportDate').value = today;
        document.getElementById('weeklyStartDate').value = this.getMonday(new Date());
        document.getElementById('cumulativeStartDate').value = today;
        document.getElementById('cumulativeEndDate').value = today;
        
        const now = new Date();
        document.getElementById('monthlyYear').value = now.getFullYear();
        document.getElementById('monthlyMonth').value = now.getMonth() + 1;
    }

    // 月曜日の日付を取得
    getMonday(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff)).toISOString().split('T')[0];
    }

    // ブロック選択
    selectBlock(blockType) {
        this.currentBlock = blockType;
        document.getElementById('block-dashboard').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('current-block-name').textContent = this.blockNames[blockType];
        
        // フォームを生成
        this.generateForm(blockType);
        
        // データ管理タブを更新
        this.loadDataList();
    }

    // ダッシュボードに戻る
    returnToDashboard() {
        this.currentBlock = null;
        document.getElementById('main-content').style.display = 'none';
        document.getElementById('block-dashboard').style.display = 'block';
        document.getElementById('dynamic-form-container').innerHTML = '';
    }

    // タブ切り替え
    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });

        if (tabName === 'data') {
            this.loadDataList();
        } else if (tabName === 'settings') {
            this.loadEmailList();
        }
    }

    // レポートタイプ切り替え
    switchReportType(type) {
        document.querySelectorAll('.report-type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });

        document.querySelectorAll('.report-settings').forEach(settings => {
            settings.classList.remove('active');
        });

        document.getElementById(`${type}-settings`).classList.add('active');
    }

    // 動的フォーム生成
    generateForm(blockType) {
        const container = document.getElementById('dynamic-form-container');
        const formConfig = this.getFormConfig(blockType);
        
        let html = `<form id="dailyReportForm">`;
        
        // 基本情報
        html += this.generateBasicInfoSection(blockType);
        
        // 各セクションを生成
        formConfig.sections.forEach(section => {
            html += this.generateFormSection(section);
        });
        
        // フォームアクション
        html += `
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> 保存
                </button>
                <button type="reset" class="btn btn-secondary">
                    <i class="fas fa-undo"></i> リセット
                </button>
            </div>
        </form>`;
        
        container.innerHTML = html;
        
        // イベントリスナーを追加
        document.getElementById('dailyReportForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveReport();
        });
        
        // 今日の日付をセット
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('reportDate').value = today;
    }

    // 基本情報セクション生成
    generateBasicInfoSection(blockType) {
        const prefix = blockType === 'dcl' ? 'DCL' : 'SLMC';
        return `
            <div class="form-section">
                <h3><i class="fas fa-info-circle"></i> 基本情報</h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="reportDate">日付 <span class="required">*</span></label>
                        <input type="date" id="reportDate" name="reportDate" required>
                    </div>
                    <div class="form-group">
                        <label for="baseName">BASE名 <span class="required">*</span></label>
                        <input type="text" id="baseName" name="baseName" placeholder="太田" required>
                    </div>
                    <div class="form-group">
                        <label for="reporterName">報告者名 <span class="required">*</span></label>
                        <input type="text" id="reporterName" name="reporterName" placeholder="山田太郎" required>
                    </div>
                </div>
            </div>
        `;
    }

    // フォームセクション生成
    generateFormSection(section) {
        let html = `
            <div class="form-section">
                <h3><i class="${section.icon}"></i> ${section.title}</h3>
                <div class="form-grid">
        `;
        
        section.fields.forEach(field => {
            html += `
                <div class="form-group ${field.colspan || ''}" data-field="${field.id}">
                    <label for="${field.id}">${field.label} <span class="required">*</span></label>
                    <input type="number" 
                           id="${field.id}" 
                           name="${field.id}" 
                           ${field.step ? `step="${field.step}"` : 'step="any"'}
                           placeholder="0"
                           required
                           ${field.readonly ? 'readonly class="calculated"' : ''}>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    }

    // バリデーション実行
    validateForm() {
        const form = document.getElementById('dailyReportForm');
        const formData = new FormData(form);
        const errors = [];
        
        // エラー表示をクリア
        document.querySelectorAll('.form-group.error').forEach(el => {
            el.classList.remove('error');
            const errorMsg = el.querySelector('.error-message');
            if (errorMsg) errorMsg.remove();
        });
        
        // 既存のバリデーションサマリーを削除
        const existingSummary = document.querySelector('.validation-summary');
        if (existingSummary) existingSummary.remove();
        
        // 必須項目チェック
        for (let [key, value] of formData.entries()) {
            const input = form.elements[key];
            const formGroup = input.closest('.form-group');
            
            if (input.hasAttribute('required') && !input.hasAttribute('readonly')) {
                if (value === '' || value === null) {
                    errors.push({
                        field: key,
                        label: input.previousElementSibling.textContent.replace('*', '').trim(),
                        message: '入力が必要です'
                    });
                    
                    if (formGroup) {
                        formGroup.classList.add('error');
                        const errorSpan = document.createElement('span');
                        errorSpan.className = 'error-message';
                        errorSpan.innerHTML = '<i class="fas fa-exclamation-circle"></i> 入力が必要です';
                        formGroup.appendChild(errorSpan);
                    }
                }
            }
        }
        
        if (errors.length > 0) {
            // バリデーションサマリーを表示
            const summary = document.createElement('div');
            summary.className = 'validation-summary';
            summary.innerHTML = `
                <h4><i class="fas fa-exclamation-triangle"></i> 入力エラーがあります（${errors.length}件）</h4>
                <ul>
                    ${errors.map(e => `<li>${e.label}: ${e.message}</li>`).join('')}
                </ul>
            `;
            
            const formContainer = document.getElementById('dynamic-form-container');
            formContainer.insertBefore(summary, form);
            
            // 最初のエラー項目までスクロール
            const firstError = document.querySelector('.form-group.error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            
            return false;
        }
        
        return true;
    }

    // レポート保存
    saveReport() {
        if (!this.currentBlock) {
            this.showNotification('ブロックが選択されていません', 'error');
            return;
        }

        // バリデーション実行
        if (!this.validateForm()) {
            this.showNotification('入力エラーがあります。赤枠の項目を確認してください', 'error');
            return;
        }

        const formData = new FormData(document.getElementById('dailyReportForm'));
        const data = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            block: this.currentBlock
        };

        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        const reports = this.getReports();
        const existingIndex = reports.findIndex(
            r => r.reportDate === data.reportDate && r.block === data.block
        );

        if (existingIndex !== -1) {
            data.id = reports[existingIndex].id;
            reports[existingIndex] = data;
            this.showNotification('データを更新しました', 'success');
        } else {
            reports.push(data);
            this.showNotification('データを保存しました', 'success');
        }

        localStorage.setItem('dailyReports', JSON.stringify(reports));
        
        // バリデーションエラー表示をクリア
        document.querySelectorAll('.form-group.error').forEach(el => {
            el.classList.remove('error');
            const errorMsg = el.querySelector('.error-message');
            if (errorMsg) errorMsg.remove();
        });
        const summary = document.querySelector('.validation-summary');
        if (summary) summary.remove();
        
        document.getElementById('dailyReportForm').reset();
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('reportDate').value = today;
        this.loadDataList();
    }

    // 前日データをコピー
    copyPreviousDayData() {
        if (!this.currentBlock) {
            this.showNotification('ブロックが選択されていません', 'error');
            return;
        }

        const reports = this.getReports().filter(r => r.block === this.currentBlock);
        if (reports.length === 0) {
            this.showNotification('コピーできるデータがありません', 'warning');
            return;
        }

        const sortedReports = reports.sort((a, b) => 
            new Date(b.reportDate) - new Date(a.reportDate)
        );
        const prevData = sortedReports[0];

        const form = document.getElementById('dailyReportForm');
        Object.keys(prevData).forEach(key => {
            const element = form.elements[key];
            if (element && key !== 'reportDate' && key !== 'id' && key !== 'timestamp' && key !== 'block') {
                element.value = prevData[key];
            }
        });

        this.showNotification('前日のデータをコピーしました', 'success');
    }

    // レポート取得
    getReports() {
        const data = localStorage.getItem('dailyReports');
        return data ? JSON.parse(data) : [];
    }

    // レポート生成
    generateReport() {
        if (!this.currentBlock) {
            this.showNotification('ブロックが選択されていません', 'error');
            return;
        }

        const activeType = document.querySelector('.report-type-btn.active').dataset.type;
        let reports = [];
        let startDate, endDate, title;

        if (activeType === 'daily') {
            const targetDate = new Date(document.getElementById('dailyReportDate').value);
            reports = this.getReports().filter(r => 
                r.reportDate === document.getElementById('dailyReportDate').value && 
                r.block === this.currentBlock
            );
            
            if (reports.length === 0) {
                this.showNotification('指定日のデータがありません', 'warning');
                document.getElementById('reportOutput').textContent = '';
                document.getElementById('sendEmail').style.display = 'none';
                return;
            }
            
            const reportText = this.buildDailyReportText(reports[0]);
            document.getElementById('reportOutput').textContent = reportText;
            this.currentReportText = reportText;
            this.showNotification('日次レポートを生成しました', 'success');
            document.querySelector('.chart-container').style.display = 'none';
            document.getElementById('sendEmail').style.display = 'inline-flex';
            return;
        }
        
        document.querySelector('.chart-container').style.display = 'block';
        document.getElementById('sendEmail').style.display = 'none';

        if (activeType === 'weekly') {
            startDate = new Date(document.getElementById('weeklyStartDate').value);
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            title = `週次レポート (${this.formatDate(startDate)} ~ ${this.formatDate(endDate)})`;
            reports = this.getReportsByDateRange(startDate, endDate).filter(r => r.block === this.currentBlock);
        } else if (activeType === 'monthly') {
            const year = parseInt(document.getElementById('monthlyYear').value);
            const month = parseInt(document.getElementById('monthlyMonth').value);
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0);
            title = `月次レポート (${year}年${month}月)`;
            reports = this.getReportsByDateRange(startDate, endDate).filter(r => r.block === this.currentBlock);
        } else if (activeType === 'cumulative') {
            startDate = new Date(document.getElementById('cumulativeStartDate').value);
            endDate = new Date(document.getElementById('cumulativeEndDate').value);
            title = `累計レポート (${this.formatDate(startDate)} ~ ${this.formatDate(endDate)})`;
            reports = this.getReportsByDateRange(startDate, endDate).filter(r => r.block === this.currentBlock);
        }

        if (reports.length === 0) {
            this.showNotification('指定期間のデータがありません', 'warning');
            document.getElementById('reportOutput').textContent = '';
            return;
        }

        // 合計値レポートを生成
        const reportText = this.buildAggregateReportText(title, reports);
        document.getElementById('reportOutput').textContent = reportText;
        this.currentReportText = reportText;
        this.drawCharts(reports);
        this.showNotification('レポートを生成しました', 'success');
        document.getElementById('sendEmail').style.display = 'inline-flex';
    }

    // 日付範囲でレポートを取得
    getReportsByDateRange(startDate, endDate) {
        const reports = this.getReports();
        return reports.filter(report => {
            const reportDate = new Date(report.reportDate);
            return reportDate >= startDate && reportDate <= endDate;
        }).sort((a, b) => new Date(a.reportDate) - new Date(b.reportDate));
    }

    // 当月データ集計（月累計・平均の自動計算）
    calculateMonthlyTotals(report, blockType) {
        const reportDate = new Date(report.reportDate);
        const year = reportDate.getFullYear();
        const month = reportDate.getMonth();
        
        // 当月のデータを取得
        const monthlyReports = this.getReports().filter(r => {
            const rDate = new Date(r.reportDate);
            return r.block === blockType && 
                   rDate.getFullYear() === year && 
                   rDate.getMonth() === month;
        });
        
        const totals = {};
        const count = monthlyReports.length;
        
        if (count === 0) return totals;
        
        // ブロック別に集計項目を定義
        if (blockType === 'center') {
            // センターブロック
            totals.fxMonthlyTotal = monthlyReports.reduce((sum, r) => sum + (parseFloat(r.fxTotal) || 0), 0);
            totals.ccMonthlyTotal = monthlyReports.reduce((sum, r) => sum + (parseFloat(r.ccTotal) || 0), 0);
            totals.netIncreaseMonthly = totals.fxMonthlyTotal - totals.ccMonthlyTotal;
            
            // VC月平均人数（vcCumulativePeople の平均、小数点第1位まで）
            const vcTotalPeople = monthlyReports.reduce((sum, r) => sum + (parseFloat(r.vcCumulativePeople) || 0), 0);
            totals.vcMonthlyAvg = Math.round((vcTotalPeople / count) * 10) / 10;
            
            // ClubEX＋商品MEXALL月累計
            totals.clubExMexallMonthly = monthlyReports.reduce((sum, r) => sum + (parseFloat(r.clubExMexall) || 0), 0);
            
            // クリニック月累計
            totals.clinicMonthlyTotal = monthlyReports.reduce((sum, r) => sum + (parseFloat(r.clinicDayOrder) || 0), 0);
            
            // 白問診枚数月累計
            totals.clinicWhiteInterviewMonthly = monthlyReports.reduce((sum, r) => sum + (parseFloat(r.clinicWhiteInterview) || 0), 0);
            
        } else {
            // 東・西・DCLブロック
            totals.monthlyFxTotal = monthlyReports.reduce((sum, r) => sum + (parseFloat(r.fxTotal) || 0), 0);
            totals.monthlyFxReferral = monthlyReports.reduce((sum, r) => sum + (parseFloat(r.fxYYX) || 0), 0);  // YYXを紹介として集計
            totals.monthlyCcTotal = monthlyReports.reduce((sum, r) => sum + (parseFloat(r.ccTotal) || 0), 0);
            totals.monthlyNetIncrease = totals.monthlyFxTotal - totals.monthlyCcTotal;
        }
        
        return totals;
    }

    // 日次レポートテキスト生成（ブロック別フォーマット）
    buildDailyReportText(report) {
        const blockType = report.block;
        const prefix = blockType === 'dcl' ? 'DCL' : 'SLMC';
        const reportDate = new Date(report.reportDate);
        const month = reportDate.getMonth() + 1;
        const day = reportDate.getDate();
        
        // 月累計・平均を自動計算
        const monthlyTotals = this.calculateMonthlyTotals(report, blockType);
        
        let text = `${prefix}${report.baseName || ''}BASE　${report.reporterName || ''}です。\n\n`;
        text += `${month}月${day}日の日次報告を致します。\n\n`;
        
        // ブロック別にフォーマット
        if (blockType === 'center') {
            text += this.buildCenterBlockReport(report, monthlyTotals);
        } else if (blockType === 'east' || blockType === 'west' || blockType === 'dcl') {
            text += this.buildEastWestDCLReport(report, blockType, monthlyTotals);
        }
        
        return text;
    }

    // センターブロックレポート
    buildCenterBlockReport(report, monthlyTotals) {
        let text = `架電:${report.outgoingCalls || 0}軒　内通話数:${report.outgoingConnected || 0}軒　内約束（アポイント）数:${report.outgoingAppointments || 0}軒　内来場理由:イベント${report.outgoingEventVisit || 0}軒、それ以外:${report.outgoingOtherVisit || 0}軒\n\n`;
        text += `家族約束:${report.outgoingFamilyPromise || 0}軒　来場平均人数:${report.outgoingAvgVisitors || 0}人\n\n`;
        text += `受電:${report.incomingCalls || 0}軒　内約束（アポイント）数:${report.incomingAppointments || 0}軒　内来場理由:イベント:${report.incomingEventVisit || 0}軒、それ以外:${report.incomingOtherVisit || 0}軒\n\n`;
        text += `家族約束:${report.incomingFamilyPromise || 0}軒　来場平均人数:${report.incomingAvgVisitors || 0}人\n\n`;
        text += `□純増\n\n`;
        text += `FX:${report.fxTotal || 0}軒(VC:Club26:${report.fxVcClub26 || 0}軒/Club25:${report.fxVcClub25 || 0}軒/その他:${report.fxVcOther || 0}軒) 月累計:${monthlyTotals.fxMonthlyTotal || 0}軒\n\n`;
        text += `CC:${report.ccTotal || 0}軒 月累計${monthlyTotals.ccMonthlyTotal || 0}軒\n\n`;
        text += `純増月累計:${monthlyTotals.netIncreaseMonthly || 0}軒\n\n`;
        text += `□VC/ClubEX:${report.vcClubExTotal || 0}軒(内FX:${report.vcClubExFx || 0}軒)\n\n`;
        text += `※当日VC内訳\n\n`;
        text += `内商店主DX:${report.vcMerchantDx || 0}軒\n\n`;
        text += `内Life&WorkStyleOnsite:${report.vcLifeWorkOnsite || 0}軒\n\n`;
        text += `内Life&WorkStyle:${report.vcLifeWork || 0}軒\n\n`;
        text += `内LifeStyle&On-site:${report.vcLifeStyleOnsite || 0}軒\n\n`;
        text += `内LifeStyle:${report.vcLifeStyle || 0}軒\n\n`;
        text += `内L&On-site:${report.vcLOnsite || 0}軒\n\n`;
        text += `内Lounge:${report.vcLounge || 0}軒\n\n`;
        text += `VC内訳累計人数${report.vcCumulativePeople || 0}軒 (1人:${report.vcPeople1 || 0}軒　2人:${report.vcPeople2 || 0}軒　4人:${report.vcPeople4 || 0}軒) VC月平均人数:${monthlyTotals.vcMonthlyAvg || 0}人\n\n`;
        text += `ClubEX＋商品MEXALL:${report.clubExMexall || 0}　月累計${monthlyTotals.clubExMexallMonthly || 0}\n\n`;
        text += `□クリニック\n\n`;
        text += `当日受注${report.clinicDayOrder || 0}千円\n\n`;
        text += `当日受注内訳　(店内:${report.clinicInStoreOrder || 0}千円 問診:${report.clinicInterviewOrder || 0}千円)\n\n`;
        text += `当月累計実クリニック完了 ：${monthlyTotals.clinicMonthlyTotal || 0}千円\n\n`;
        text += `当日白問診枚数　${report.clinicWhiteInterview || 0}枚　当月累計　${monthlyTotals.clinicWhiteInterviewMonthly || 0}枚\n\n`;
        
        return text;
    }

    // 東・西・DCLブロックレポート
    buildEastWestDCLReport(report, blockType, monthlyTotals) {
        let text = `架電：${report.outgoingCalls || 0}軒\n\n`;
        text += `内通話数：${report.outgoingConnected || 0}軒\n\n`;
        text += `内約束（アポイント）数：${report.outgoingAppointments || 0}軒\n\n`;
        text += `内来場理由：\n\n`;
        text += `イベント${report.outgoingEventVisit || 0}軒\n\n`;
        text += `それ以外${report.outgoingOtherVisit || 0}軒\n\n`;
        text += `家族約束：${report.outgoingFamilyPromise || 0}軒\n\n`;
        text += `来場平均人数：${report.outgoingAvgVisitors || 0}人\n\n`;
        text += `受電：${report.incomingCalls || 0}軒\n\n`;
        text += `内約束（アポイント）数：${report.incomingAppointments || 0}軒\n\n`;
        text += `内来場理由：\n\n`;
        text += `イベント${report.incomingEventVisit || 0}軒\n\n`;
        text += `それ以外${report.incomingOtherVisit || 0}軒\n\n`;
        text += `家族約束：${report.incomingFamilyPromise || 0}軒\n\n`;
        text += `来場平均人数：${report.incomingAvgVisitors || 0}人\n\n`;
        text += `商品売上受注：${report.productSalesOrder || 0}千円\n\n`;
        text += `商品売上完了：${report.productSalesComplete || 0}千円\n\n`;
        text += `クリニック売上受注：${report.clinicSalesOrder || 0}千円\n\n`;
        text += `内店内売上受注：${report.clinicInStoreOrder || 0}千円\n\n`;
        text += `内問診売上受注：${report.clinicInterviewOrder || 0}千円\n\n`;
        text += `クリニック売上完了：${report.clinicSalesComplete || 0}千円\n\n`;
        text += `内店内売上完了：${report.clinicInStoreComplete || 0}千円\n\n`;
        text += `内問診売上完了：${report.clinicInterviewComplete || 0}千円\n\n`;
        text += `VC：${report.vcTotal || 0}軒(内新規同時：${report.vcNewSimultaneous || 0}軒)\n\n`;
        
        if (blockType === 'west' || blockType === 'dcl') {
            text += `内Life&WorkStyle：${report.vcLifeWorkStyle || 0}軒\n\n`;
            text += `内Life Style：${report.vcLifeStyle || 0}軒\n\n`;
            text += `内LO：${report.vcLO || 0}軒\n\n`;
        }
        
        text += `内CC：${report.vcCC || 0}軒\n\n`;
        text += `内L＆L：${report.vcLL || 0}軒\n\n`;
        text += `内L：${report.vcL || 0}軒\n\n`;
        text += `内４人：${report.vcPeople4 || 0}軒\n\n`;
        text += `内2人：${report.vcPeople2 || 0}軒\n\n`;
        text += `内1人：${report.vcPeople1 || 0}軒\n\n`;
        text += `FX：${report.fxTotal || 0}軒(内YYX：${report.fxYYX || 0}軒、内FF：${report.fxFF || 0}軒、内サブスクからのUPS：${report.fxSubscriptionUPS || 0}軒)\n\n`;
        text += `加入単価：${report.joinUnitPrice || 0}千円\n\n`;
        text += `CC：${report.ccTotal || 0}軒\n\n`;
        text += `離脱単価：${report.withdrawalUnitPrice || 0}千円\n\n`;
        text += `純増：${report.netIncrease || 0}軒\n\n`;
        text += `月累計FX：${monthlyTotals.monthlyFxTotal || 0}軒(内紹介：${monthlyTotals.monthlyFxReferral || 0}軒)\n\n`;
        text += `月累計CC：${monthlyTotals.monthlyCcTotal || 0}軒\n\n`;
        text += `月累計純増：${monthlyTotals.monthlyNetIncrease || 0}軒\n\n`;
        text += `EX：${report.exGroups || 0}組${report.exCases || 0}件\n\n`;
        text += `内商品EX：${report.productEx || 0}件\n\n`;
        text += `NX：${report.nx || 0}件\n\n`;
        text += `回線、契約数増減：${report.lineContractChange || 0}件\n\n`;
        text += `内新規同時：${report.newSimultaneous || 0}件\n\n`;
        text += `内離脱同時：${report.withdrawalSimultaneous || 0}件\n\n`;
        text += `内入れ替え：${report.replacement || 0}件\n\n`;
        
        if (blockType === 'dcl') {
            text += `ケーズデンキ　販売実績\n\n`;
            text += `PCALL：${report.ksPcAll || 0}台（KSからの紹介：${report.ksPcReferral || 0}件、CL問診経由買替：${report.ksPcClinReplacement || 0}件、プランナー自販売：${report.ksPcSelfSales || 0}件）\n\n`;
            text += `スマホタブALL：${report.ksSmartTabAll || 0}台（KSからの紹介：${report.ksSmartTabReferral || 0}件、CL問診経由買替：${report.ksSmartTabClinReplacement || 0}件、プランナー自販売：${report.ksSmartTabSelfSales || 0}件）\n\n`;
        }
        
        return text;
    }

    // 合計値レポート生成（週次・月次・累計用）
    buildAggregateReportText(title, reports) {
        let text = `${'='.repeat(60)}\n`;
        text += `${title}\n`;
        text += `ブロック: ${this.blockNames[this.currentBlock]}\n`;
        text += `生成日時: ${new Date().toLocaleString('ja-JP')}\n`;
        text += `データ件数: ${reports.length}件\n`;
        
        // 期間の表示
        if (reports.length > 0) {
            const startDate = reports[0].reportDate;
            const endDate = reports[reports.length - 1].reportDate;
            text += `対象期間: ${startDate} 〜 ${endDate}\n`;
        }
        
        text += `${'='.repeat(60)}\n\n`;

        // 合計値を計算
        const totals = this.calculateTotals(reports);
        
        // ブロック別にレポート生成
        if (this.currentBlock === 'center') {
            text += this.buildCenterAggregateReport(totals, reports.length);
        } else {
            text += this.buildEastWestDCLAggregateReport(totals, reports.length);
        }
        
        text += `\n${'='.repeat(60)}\n`;
        text += `【期間合計レポート】\n`;
        text += `${'='.repeat(60)}\n`;
        
        return text;
    }

    // センターブロック合計レポート
    buildCenterAggregateReport(totals, dataCount) {
        let text = `【合計値】\n\n`;
        
        text += `架電：${totals.outgoingCalls || 0}軒\n\n`;
        text += `内通話数：${totals.outgoingConnected || 0}軒\n\n`;
        text += `内約束（アポイント）数：${totals.outgoingAppointments || 0}軒\n\n`;
        text += `内来場理由：イベント${totals.outgoingEventVisit || 0}軒、それ以外${totals.outgoingOtherVisit || 0}軒\n\n`;
        text += `家族約束：${totals.outgoingFamilyPromise || 0}軒\n\n`;
        text += `来場平均人数：${dataCount > 0 ? Math.round((totals.outgoingAvgVisitors || 0) / dataCount * 10) / 10 : 0}人（平均）\n\n`;
        
        text += `受電：${totals.incomingCalls || 0}軒\n\n`;
        text += `内約束（アポイント）数：${totals.incomingAppointments || 0}軒\n\n`;
        text += `内来場理由：イベント${totals.incomingEventVisit || 0}軒、それ以外${totals.incomingOtherVisit || 0}軒\n\n`;
        text += `家族約束：${totals.incomingFamilyPromise || 0}軒\n\n`;
        text += `来場平均人数：${dataCount > 0 ? Math.round((totals.incomingAvgVisitors || 0) / dataCount * 10) / 10 : 0}人（平均）\n\n`;
        
        text += `□純増\n\n`;
        text += `FX：${totals.fxTotal || 0}軒\n`;
        text += `(VC:Club26:${totals.fxVcClub26 || 0}軒/Club25:${totals.fxVcClub25 || 0}軒/その他:${totals.fxVcOther || 0}軒)\n\n`;
        text += `CC：${totals.ccTotal || 0}軒\n\n`;
        text += `純増：${(totals.fxTotal || 0) - (totals.ccTotal || 0)}軒\n\n`;
        
        text += `□VC/ClubEX：${totals.vcClubExTotal || 0}軒(内FX:${totals.vcClubExFx || 0}軒)\n\n`;
        text += `※VC内訳\n\n`;
        text += `内商店主DX：${totals.vcMerchantDx || 0}軒\n\n`;
        text += `内Life&WorkStyleOnsite：${totals.vcLifeWorkOnsite || 0}軒\n\n`;
        text += `内Life&WorkStyle：${totals.vcLifeWork || 0}軒\n\n`;
        text += `内LifeStyle&On-site：${totals.vcLifeStyleOnsite || 0}軒\n\n`;
        text += `内LifeStyle：${totals.vcLifeStyle || 0}軒\n\n`;
        text += `内L&On-site：${totals.vcLOnsite || 0}軒\n\n`;
        text += `内Lounge：${totals.vcLounge || 0}軒\n\n`;
        text += `VC内訳累計人数：${totals.vcCumulativePeople || 0}軒\n`;
        text += `(1人:${totals.vcPeople1 || 0}軒　2人:${totals.vcPeople2 || 0}軒　4人:${totals.vcPeople4 || 0}軒)\n\n`;
        text += `VC平均人数：${dataCount > 0 ? Math.round((totals.vcCumulativePeople || 0) / dataCount * 10) / 10 : 0}人（平均）\n\n`;
        
        text += `ClubEX＋商品MEXALL：${totals.clubExMexall || 0}\n\n`;
        
        text += `□クリニック\n\n`;
        text += `期間受注合計：${totals.clinicDayOrder || 0}千円\n\n`;
        text += `期間受注内訳（店内:${totals.clinicInStoreOrder || 0}千円 問診:${totals.clinicInterviewOrder || 0}千円）\n\n`;
        text += `期間実クリニック完了合計：${totals.clinicDayOrder || 0}千円\n\n`;
        text += `期間白問診枚数合計：${totals.clinicWhiteInterview || 0}枚\n\n`;
        
        return text;
    }

    // 東・西・DCLブロック合計レポート
    buildEastWestDCLAggregateReport(totals, dataCount) {
        let text = `【合計値】\n\n`;
        
        text += `架電：${totals.outgoingCalls || 0}軒\n\n`;
        text += `内通話数：${totals.outgoingConnected || 0}軒\n\n`;
        text += `内約束（アポイント）数：${totals.outgoingAppointments || 0}軒\n\n`;
        text += `内来場理由：イベント${totals.outgoingEventVisit || 0}軒、それ以外${totals.outgoingOtherVisit || 0}軒\n\n`;
        text += `家族約束：${totals.outgoingFamilyPromise || 0}軒\n\n`;
        text += `来場平均人数：${dataCount > 0 ? Math.round((totals.outgoingAvgVisitors || 0) / dataCount * 10) / 10 : 0}人（平均）\n\n`;
        
        text += `受電：${totals.incomingCalls || 0}軒\n\n`;
        text += `内約束（アポイント）数：${totals.incomingAppointments || 0}軒\n\n`;
        text += `内来場理由：イベント${totals.incomingEventVisit || 0}軒、それ以外${totals.incomingOtherVisit || 0}軒\n\n`;
        text += `家族約束：${totals.incomingFamilyPromise || 0}軒\n\n`;
        text += `来場平均人数：${dataCount > 0 ? Math.round((totals.incomingAvgVisitors || 0) / dataCount * 10) / 10 : 0}人（平均）\n\n`;
        
        text += `商品売上受注：${totals.productSalesOrder || 0}千円\n\n`;
        text += `商品売上完了：${totals.productSalesComplete || 0}千円\n\n`;
        text += `クリニック売上受注：${totals.clinicSalesOrder || 0}千円\n\n`;
        text += `内店内売上受注：${totals.clinicInStoreOrder || 0}千円\n\n`;
        text += `内問診売上受注：${totals.clinicInterviewOrder || 0}千円\n\n`;
        text += `クリニック売上完了：${totals.clinicSalesComplete || 0}千円\n\n`;
        text += `内店内売上完了：${totals.clinicInStoreComplete || 0}千円\n\n`;
        text += `内問診売上完了：${totals.clinicInterviewComplete || 0}千円\n\n`;
        
        text += `VC：${totals.vcTotal || 0}軒(内新規同時：${totals.vcNewSimultaneous || 0}軒)\n\n`;
        
        if (this.currentBlock === 'west' || this.currentBlock === 'dcl') {
            text += `内Life&WorkStyle：${totals.vcLifeWorkStyle || 0}軒\n\n`;
            text += `内Life Style：${totals.vcLifeStyle || 0}軒\n\n`;
            text += `内LO：${totals.vcLO || 0}軒\n\n`;
        }
        
        text += `内CC：${totals.vcCC || 0}軒\n\n`;
        text += `内L＆L：${totals.vcLL || 0}軒\n\n`;
        text += `内L：${totals.vcL || 0}軒\n\n`;
        text += `内４人：${totals.vcPeople4 || 0}軒\n\n`;
        text += `内2人：${totals.vcPeople2 || 0}軒\n\n`;
        text += `内1人：${totals.vcPeople1 || 0}軒\n\n`;
        
        text += `FX：${totals.fxTotal || 0}軒\n`;
        text += `(内YYX：${totals.fxYYX || 0}軒、内FF：${totals.fxFF || 0}軒、内サブスクからのUPS：${totals.fxSubscriptionUPS || 0}軒)\n\n`;
        text += `加入単価平均：${dataCount > 0 ? Math.round((totals.joinUnitPrice || 0) / dataCount * 10) / 10 : 0}千円（平均）\n\n`;
        
        text += `CC：${totals.ccTotal || 0}軒\n\n`;
        text += `離脱単価平均：${dataCount > 0 ? Math.round((totals.withdrawalUnitPrice || 0) / dataCount * 10) / 10 : 0}千円（平均）\n\n`;
        
        text += `純増：${totals.netIncrease || 0}軒\n\n`;
        
        text += `EX：${totals.exGroups || 0}組${totals.exCases || 0}件\n\n`;
        text += `内商品EX：${totals.productEx || 0}件\n\n`;
        text += `NX：${totals.nx || 0}件\n\n`;
        text += `回線、契約数増減：${totals.lineContractChange || 0}件\n\n`;
        text += `内新規同時：${totals.newSimultaneous || 0}件\n\n`;
        text += `内離脱同時：${totals.withdrawalSimultaneous || 0}件\n\n`;
        text += `内入れ替え：${totals.replacement || 0}件\n\n`;
        
        if (this.currentBlock === 'dcl') {
            text += `ケーズデンキ　販売実績\n\n`;
            text += `PCALL：${totals.ksPcAll || 0}台\n`;
            text += `（KSからの紹介：${totals.ksPcReferral || 0}件、CL問診経由買替：${totals.ksPcClinReplacement || 0}件、プランナー自販売：${totals.ksPcSelfSales || 0}件）\n\n`;
            text += `スマホタブALL：${totals.ksSmartTabAll || 0}台\n`;
            text += `（KSからの紹介：${totals.ksSmartTabReferral || 0}件、CL問診経由買替：${totals.ksSmartTabClinReplacement || 0}件、プランナー自販売：${totals.ksSmartTabSelfSales || 0}件）\n\n`;
        }
        
        return text;
    }

    // 集計レポートテキスト生成（旧形式・参考用に保持）
    buildReportText(title, reports) {
        let text = `${'='.repeat(60)}\n`;
        text += `${title}\n`;
        text += `ブロック: ${this.blockNames[this.currentBlock]}\n`;
        text += `生成日時: ${new Date().toLocaleString('ja-JP')}\n`;
        text += `データ件数: ${reports.length}件\n`;
        text += `${'='.repeat(60)}\n\n`;

        const totals = this.calculateTotals(reports);
        
        text += `【主要指標の合計】\n`;
        Object.keys(totals).slice(0, 20).forEach(key => {
            if (typeof totals[key] === 'number') {
                text += `${key}: ${totals[key]}\n`;
            }
        });
        
        text += `\n【日別データ】\n`;
        reports.forEach((report, index) => {
            text += `\n${index + 1}日目: ${report.reportDate}\n`;
            text += `報告者: ${report.reporterName || '-'} / BASE: ${report.baseName || '-'}\n`;
        });
        
        text += `\n${'='.repeat(60)}\n`;
        
        return text;
    }

    // 合計計算（マイナス値対応）
    calculateTotals(reports) {
        const totals = {};
        if (reports.length === 0) return totals;
        
        const sampleReport = reports[0];
        Object.keys(sampleReport).forEach(key => {
            if (typeof sampleReport[key] === 'string' && !isNaN(parseFloat(sampleReport[key]))) {
                totals[key] = reports.reduce((sum, report) => 
                    sum + (parseFloat(report[key]) || 0), 0
                );
            }
        });
        
        return totals;
    }

    // レポートダウンロード
    downloadReport() {
        const reportText = document.getElementById('reportOutput').textContent;
        if (!reportText) {
            this.showNotification('レポートを先に生成してください', 'warning');
            return;
        }

        const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.blockNames[this.currentBlock]}_日次報告書_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);

        this.showNotification('レポートをダウンロードしました', 'success');
    }

    // CSVダウンロード
    downloadCSV() {
        const reports = this.getReports();
        
        if (reports.length === 0) {
            this.showNotification('ダウンロードするデータがありません', 'warning');
            return;
        }

        // CSVヘッダーを作成（全フィールドを含む）
        const headers = [
            'ID', 'ブロック', '日付', 'BASE名', '報告者名'
        ];

        // サンプルレポートから全フィールドを取得
        const sampleReport = reports[0];
        const fieldKeys = Object.keys(sampleReport).filter(key => 
            !['id', 'block', 'reportDate', 'baseName', 'reporterName'].includes(key)
        );
        
        headers.push(...fieldKeys);

        // CSVデータを作成
        let csvContent = '\uFEFF'; // BOM（Excel で日本語を正しく表示するため）
        csvContent += headers.join(',') + '\n';

        reports.forEach(report => {
            const row = [
                this.escapeCsvValue(report.id),
                this.escapeCsvValue(this.blockNames[report.block] || report.block),
                this.escapeCsvValue(report.reportDate),
                this.escapeCsvValue(report.baseName),
                this.escapeCsvValue(report.reporterName)
            ];

            fieldKeys.forEach(key => {
                row.push(this.escapeCsvValue(report[key]));
            });

            csvContent += row.join(',') + '\n';
        });

        // ダウンロード実行
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SLMC日次報告_全データ_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        this.showNotification(`${reports.length}件のデータをCSVでダウンロードしました`, 'success');
    }

    // CSV用の値をエスケープ
    escapeCsvValue(value) {
        if (value === null || value === undefined) {
            return '';
        }
        const stringValue = String(value);
        // カンマ、改行、ダブルクォートを含む場合はダブルクォートで囲む
        if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
            return '"' + stringValue.replace(/"/g, '""') + '"';
        }
        return stringValue;
    }

    // メール送信モーダルを開く
    openEmailModal() {
        if (!this.currentReportText) {
            this.showNotification('レポートを先に生成してください', 'warning');
            return;
        }

        const emails = this.getEmailAddresses();

        if (emails.length === 0) {
            this.showNotification('送信先が登録されていません。メール設定タブで登録してください', 'warning');
            return;
        }

        // 送信先チェックボックスリストを生成（全ての登録済みメールアドレスを表示）
        const listContainer = document.getElementById('emailRecipientList');
        listContainer.innerHTML = '';
        emails.forEach(email => {
            const item = document.createElement('div');
            item.className = 'email-recipient-item';
            item.innerHTML = `
                <input type="checkbox" id="recipient_${email.id}" value="${email.id}" data-address="${email.address}">
                <label for="recipient_${email.id}">
                    <div class="email-recipient-name">${email.name}</div>
                    <div class="email-recipient-address">${email.address}</div>
                </label>
            `;
            listContainer.appendChild(item);
        });

        // 件名と本文を設定（データ入力画面の日付とBASE名を使用）
        const reportDate = document.getElementById('reportDate').value;
        const baseName = document.getElementById('baseName').value || 'BASE';
        const dateObj = new Date(reportDate);
        const month = dateObj.getMonth() + 1;
        const day = dateObj.getDate();
        
        document.getElementById('emailSubject').value = `日次報告 ${month}月${day}日 ${baseName}`;
        document.getElementById('emailBody').value = this.currentReportText;

        // モーダルを表示
        document.getElementById('emailModal').classList.add('active');
    }

    // メール送信モーダルを閉じる
    closeEmailModal() {
        document.getElementById('emailModal').classList.remove('active');
    }

    // メール送信
    sendEmail() {
        // 選択された送信先を取得
        const checkboxes = document.querySelectorAll('#emailRecipientList input[type="checkbox"]:checked');
        
        if (checkboxes.length === 0) {
            this.showNotification('送信先を1つ以上選択してください', 'warning');
            return;
        }

        // 選択された全メールアドレスを取得
        const recipientAddresses = Array.from(checkboxes).map(cb => cb.dataset.address);

        const subject = document.getElementById('emailSubject').value;
        const body = document.getElementById('emailBody').value;

        // mailto: リンクを生成（複数宛先はカンマ区切り）
        const recipientsString = recipientAddresses.join(',');
        const mailtoLink = `mailto:${recipientsString}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        // メールクライアントを開く
        window.location.href = mailtoLink;
        
        this.closeEmailModal();
        this.showNotification(`メールソフトを起動しました（${checkboxes.length}件の送信先）`, 'success');
    }

    // メールアドレス追加
    addEmailAddress() {
        const name = document.getElementById('emailName').value.trim();
        const address = document.getElementById('emailAddress').value.trim();

        if (!name || !address) {
            this.showNotification('送信先名とメールアドレスを入力してください', 'warning');
            return;
        }

        // メールアドレス形式チェック
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(address)) {
            this.showNotification('正しいメールアドレスを入力してください', 'error');
            return;
        }

        const emails = this.getEmailAddresses();
        const newEmail = {
            id: Date.now().toString(),
            name: name,
            address: address
        };

        emails.push(newEmail);
        localStorage.setItem('emailAddresses', JSON.stringify(emails));

        // フォームをクリア
        document.getElementById('emailName').value = '';
        document.getElementById('emailAddress').value = '';

        this.loadEmailList();
        this.showNotification('送信先を追加しました', 'success');
    }

    // メールアドレス一覧を読み込み
    loadEmailList() {
        const emails = this.getEmailAddresses();
        const listContainer = document.getElementById('emailList');

        if (emails.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>送信先が登録されていません</h3>
                    <p>上のフォームから送信先を追加してください</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = emails.map(email => {
            return `
                <div class="email-item">
                    <div class="email-item-info">
                        <div class="email-item-name">${email.name}</div>
                        <div class="email-item-address">${email.address}</div>
                    </div>
                    <div class="email-item-actions">
                        <button class="btn btn-danger btn-sm" onclick="app.deleteEmailAddress('${email.id}')">
                            <i class="fas fa-trash"></i> 削除
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // メールアドレス削除
    deleteEmailAddress(id) {
        if (!confirm('この送信先を削除してもよろしいですか？')) {
            return;
        }

        const emails = this.getEmailAddresses();
        const filtered = emails.filter(e => e.id !== id);
        localStorage.setItem('emailAddresses', JSON.stringify(filtered));

        this.loadEmailList();
        this.showNotification('送信先を削除しました', 'success');
    }

    // メールアドレスを取得
    getEmailAddresses() {
        const data = localStorage.getItem('emailAddresses');
        return data ? JSON.parse(data) : [];
    }

    // グラフ描画
    drawCharts(reports) {
        if (this.charts.netIncrease) this.charts.netIncrease.destroy();
        if (this.charts.vcClubEx) this.charts.vcClubEx.destroy();

        const dates = reports.map(r => this.formatDate(new Date(r.reportDate)));
        
        const netIncreaseCtx = document.getElementById('netIncreaseChart').getContext('2d');
        this.charts.netIncrease = new Chart(netIncreaseCtx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'FX',
                    data: reports.map(r => parseFloat(r.fxTotal) || 0),
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'FX推移',
                        font: { size: 16, weight: 'bold' }
                    }
                }
            }
        });

        const vcClubExCtx = document.getElementById('vcClubExChart').getContext('2d');
        this.charts.vcClubEx = new Chart(vcClubExCtx, {
            type: 'bar',
            data: {
                labels: dates,
                datasets: [{
                    label: 'VC',
                    data: reports.map(r => parseFloat(r.vcTotal) || 0),
                    backgroundColor: 'rgba(37, 99, 235, 0.7)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'VC推移',
                        font: { size: 16, weight: 'bold' }
                    }
                }
            }
        });
    }

    // データ一覧を読み込み
    loadDataList() {
        const reports = this.getReports().sort((a, b) => 
            new Date(b.reportDate) - new Date(a.reportDate)
        );

        const dataList = document.getElementById('dataList');

        if (reports.length === 0) {
            dataList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>データがありません</h3>
                    <p>ブロックを選択してデータを登録してください</p>
                </div>
            `;
            return;
        }

        dataList.innerHTML = reports.map(report => `
            <div class="data-item">
                <div class="data-item-header">
                    <div>
                        <div class="data-item-date">${report.reportDate} - ${this.blockNames[report.block]}</div>
                        <div class="data-item-info">
                            ${report.baseName || '-'} / ${report.reporterName || '-'}
                        </div>
                    </div>
                    <div class="data-item-actions">
                        <button class="btn btn-secondary btn-sm" onclick="app.editReport('${report.id}')">
                            <i class="fas fa-edit"></i> 編集
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="app.deleteReport('${report.id}')">
                            <i class="fas fa-trash"></i> 削除
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // データ検索
    searchData() {
        const block = document.getElementById('searchBlock').value;
        const startDate = document.getElementById('searchStartDate').value;
        const endDate = document.getElementById('searchEndDate').value;

        let reports = this.getReports();

        if (block) {
            reports = reports.filter(r => r.block === block);
        }

        if (startDate && endDate) {
            reports = reports.filter(r => r.reportDate >= startDate && r.reportDate <= endDate);
        }

        reports.sort((a, b) => new Date(b.reportDate) - new Date(a.reportDate));

        const dataList = document.getElementById('dataList');

        if (reports.length === 0) {
            dataList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>該当するデータがありません</h3>
                </div>
            `;
            return;
        }

        dataList.innerHTML = reports.map(report => `
            <div class="data-item">
                <div class="data-item-header">
                    <div>
                        <div class="data-item-date">${report.reportDate} - ${this.blockNames[report.block]}</div>
                        <div class="data-item-info">
                            ${report.baseName || '-'} / ${report.reporterName || '-'}
                        </div>
                    </div>
                    <div class="data-item-actions">
                        <button class="btn btn-secondary btn-sm" onclick="app.editReport('${report.id}')">
                            <i class="fas fa-edit"></i> 編集
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="app.deleteReport('${report.id}')">
                            <i class="fas fa-trash"></i> 削除
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        this.showNotification(`${reports.length}件のデータが見つかりました`, 'success');
    }

    // レポート編集（数値のみ編集可能なモーダル表示）
    editReport(id) {
        const reports = this.getReports();
        const report = reports.find(r => r.id === id);
        
        if (!report) return;

        this.currentEditId = id;
        
        // 編集モーダルを生成
        this.openEditModal(report);
    }
    
    // 編集モーダルを開く
    openEditModal(report) {
        const modal = document.getElementById('editModal');
        const formContainer = document.getElementById('editFormContainer');
        
        // ブロック設定を取得
        const config = this.getFormConfig(report.block);
        
        // フォームHTML生成（数値フィールドのみ）
        let formHTML = `
            <div class="edit-info-section">
                <h4><i class="fas fa-info-circle"></i> データ情報</h4>
                <div class="edit-info-grid">
                    <div class="edit-info-item">
                        <label>報告日</label>
                        <div class="edit-info-value">${report.reportDate}</div>
                    </div>
                    <div class="edit-info-item">
                        <label>ブロック</label>
                        <div class="edit-info-value">${this.blockNames[report.block]}</div>
                    </div>
                    <div class="edit-info-item">
                        <label>BASE名</label>
                        <div class="edit-info-value">${report.baseName || '-'}</div>
                    </div>
                    <div class="edit-info-item">
                        <label>報告者名</label>
                        <div class="edit-info-value">${report.reporterName || '-'}</div>
                    </div>
                </div>
            </div>
            <div class="edit-fields-section">
                <h4><i class="fas fa-edit"></i> 数値データ編集</h4>
        `;
        
        // 各セクションの数値フィールドを生成
        config.sections.forEach(section => {
            formHTML += `
                <div class="edit-section">
                    <h5><i class="${section.icon}"></i> ${section.title}</h5>
                    <div class="edit-fields-grid">
            `;
            
            section.fields.forEach(field => {
                const value = report[field.id] || '';
                const step = field.step || '1';
                formHTML += `
                    <div class="form-group">
                        <label for="edit_${field.id}">${field.label}</label>
                        <input type="number" 
                               id="edit_${field.id}" 
                               name="${field.id}" 
                               value="${value}" 
                               step="${step}"
                               class="form-control">
                    </div>
                `;
            });
            
            formHTML += `
                    </div>
                </div>
            `;
        });
        
        formHTML += '</div>';
        formContainer.innerHTML = formHTML;
        
        modal.style.display = 'flex';
    }
    
    // 編集内容を保存
    saveEdit() {
        const reports = this.getReports();
        const reportIndex = reports.findIndex(r => r.id === this.currentEditId);
        
        if (reportIndex === -1) {
            this.showNotification('データが見つかりません', 'error');
            return;
        }
        
        const report = reports[reportIndex];
        const form = document.getElementById('editFormContainer');
        
        // 数値フィールドのみ更新
        const inputs = form.querySelectorAll('input[type="number"]');
        inputs.forEach(input => {
            report[input.name] = input.value;
        });
        
        // 保存
        localStorage.setItem('dailyReports', JSON.stringify(reports));
        
        this.closeModal(document.getElementById('editModal'));
        this.loadDataList();
        this.showNotification('データを更新しました', 'success');
        this.currentEditId = null;
    }

    // レポート削除
    deleteReport(id) {
        if (!confirm('このデータを削除してもよろしいですか？')) {
            return;
        }

        const reports = this.getReports();
        const filtered = reports.filter(r => r.id !== id);
        
        localStorage.setItem('dailyReports', JSON.stringify(filtered));
        this.loadDataList();
        this.showNotification('データを削除しました', 'success');
    }

    // 全データエクスポート
    exportAllData() {
        const reports = this.getReports();
        
        if (reports.length === 0) {
            this.showNotification('エクスポートするデータがありません', 'warning');
            return;
        }

        const dataStr = JSON.stringify(reports, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `全データ_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showNotification('全データをエクスポートしました', 'success');
    }
    
    // データインポートモーダルを開く
    openImportModal() {
        const modal = document.getElementById('importModal');
        document.getElementById('importFileInput').value = '';
        document.getElementById('importFileName').textContent = 'ファイルが選択されていません';
        document.getElementById('importPreview').style.display = 'none';
        document.getElementById('importActions').style.display = 'none';
        modal.style.display = 'flex';
    }
    
    // ファイル選択処理
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        document.getElementById('importFileName').textContent = file.name;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (!Array.isArray(data)) {
                    throw new Error('データ形式が不正です。配列形式のJSONファイルを選択してください。');
                }
                
                // データをプレビュー
                this.previewImportData(data);
                
            } catch (error) {
                this.showNotification(`ファイル読み込みエラー: ${error.message}`, 'error');
                document.getElementById('importFileInput').value = '';
                document.getElementById('importFileName').textContent = 'ファイルが選択されていません';
            }
        };
        
        reader.readAsText(file);
    }
    
    // インポートデータのプレビュー表示
    previewImportData(data) {
        const previewContainer = document.getElementById('importPreview');
        const actionsContainer = document.getElementById('importActions');
        
        const existingReports = this.getReports();
        
        // 重複チェック
        const duplicates = [];
        data.forEach(item => {
            const exists = existingReports.find(r => 
                r.reportDate === item.reportDate && r.block === item.block
            );
            if (exists) {
                duplicates.push(item);
            }
        });
        
        // プレビュー表示
        let previewHTML = `
            <div class="import-preview-summary">
                <div class="import-stat">
                    <i class="fas fa-file-import"></i>
                    <div>
                        <div class="import-stat-value">${data.length}件</div>
                        <div class="import-stat-label">インポートデータ</div>
                    </div>
                </div>
                <div class="import-stat">
                    <i class="fas fa-database"></i>
                    <div>
                        <div class="import-stat-value">${existingReports.length}件</div>
                        <div class="import-stat-label">既存データ</div>
                    </div>
                </div>
        `;
        
        if (duplicates.length > 0) {
            previewHTML += `
                <div class="import-stat warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div>
                        <div class="import-stat-value">${duplicates.length}件</div>
                        <div class="import-stat-label">重複データ</div>
                    </div>
                </div>
            `;
        }
        
        previewHTML += `</div>`;
        
        // 重複データの詳細表示
        if (duplicates.length > 0) {
            previewHTML += `
                <div class="import-duplicates">
                    <h5><i class="fas fa-copy"></i> 重複データ</h5>
                    <div class="duplicate-list">
            `;
            
            duplicates.forEach(dup => {
                previewHTML += `
                    <div class="duplicate-item">
                        <span class="duplicate-date">${dup.reportDate}</span>
                        <span class="duplicate-block">${this.blockNames[dup.block]}</span>
                        <span class="duplicate-base">${dup.baseName || '-'}</span>
                    </div>
                `;
            });
            
            previewHTML += `
                    </div>
                </div>
            `;
        }
        
        previewContainer.innerHTML = previewHTML;
        previewContainer.style.display = 'block';
        actionsContainer.style.display = 'flex';
        
        // データを一時保存
        this.tempImportData = { data, duplicates };
    }
    
    // インポート実行
    executeImport() {
        if (!this.tempImportData) {
            this.showNotification('インポートするデータがありません', 'error');
            return;
        }
        
        const mode = document.querySelector('input[name="importMode"]:checked').value;
        const { data, duplicates } = this.tempImportData;
        
        if (mode === 'add') {
            this.importAddMode(data, duplicates);
        } else {
            this.importReplaceMode(data);
        }
    }
    
    // 追加モードでインポート
    importAddMode(data, duplicates) {
        const existingReports = this.getReports();
        
        if (duplicates.length > 0) {
            const message = `${duplicates.length}件の重複データが検出されました。\n重複データはインポートされません。\n\n新規データ ${data.length - duplicates.length}件 を追加します。\n\n続行しますか？`;
            
            if (!confirm(message)) {
                return;
            }
            
            // 重複を除外してインポート
            const newData = data.filter(item => {
                return !existingReports.find(r => 
                    r.reportDate === item.reportDate && r.block === item.block
                );
            });
            
            const merged = [...existingReports, ...newData];
            localStorage.setItem('dailyReports', JSON.stringify(merged));
            
            this.closeModal(document.getElementById('importModal'));
            this.loadDataList();
            this.showNotification(`${newData.length}件のデータをインポートしました（${duplicates.length}件の重複をスキップ）`, 'success');
            this.tempImportData = null;
            
        } else {
            const message = `${data.length}件の新規データを追加します。\n\n続行しますか？`;
            
            if (!confirm(message)) {
                return;
            }
            
            const merged = [...existingReports, ...data];
            localStorage.setItem('dailyReports', JSON.stringify(merged));
            
            this.closeModal(document.getElementById('importModal'));
            this.loadDataList();
            this.showNotification(`${data.length}件のデータをインポートしました`, 'success');
            this.tempImportData = null;
        }
    }
    
    // 置き換えモードでインポート
    importReplaceMode(data) {
        const existingReports = this.getReports();
        const message = `既存の全データ（${existingReports.length}件）が削除され、\nインポートするデータ（${data.length}件）に置き換えられます。\n\n本当によろしいですか？\n\nこの操作は取り消せません。`;
        
        if (!confirm(message)) {
            return;
        }
        
        // 最終確認
        const finalConfirm = confirm('最終確認\n\n全データが削除されます。本当に実行しますか？');
        if (!finalConfirm) {
            return;
        }
        
        localStorage.setItem('dailyReports', JSON.stringify(data));
        
        this.closeModal(document.getElementById('importModal'));
        this.loadDataList();
        this.showNotification(`データを置き換えました（${data.length}件）`, 'success');
        this.tempImportData = null;
    }
    
    // モーダルを閉じる
    closeModal(modal) {
        modal.style.display = 'none';
    }

    // 通知表示
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        }[type] || 'fa-info-circle';
        
        notification.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // 日付フォーマット
    formatDate(date) {
        const d = new Date(date);
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${month}/${day}`;
    }

    // フォーム設定取得（省略：既存のgetFormConfig, getEastBlockConfig等を使用）
    getFormConfig(blockType) {
        const configs = {
            east: this.getEastBlockConfig(),
            center: this.getCenterBlockConfig(),
            west: this.getWestBlockConfig(),
            dcl: this.getDCLBlockConfig()
        };
        return configs[blockType];
    }

    getEastBlockConfig() {
        return {
            sections: [
                {
                    title: '架電関連',
                    icon: 'fas fa-phone-alt',
                    fields: [
                        { id: 'outgoingCalls', label: '架電数（軒）', type: 'number' },
                        { id: 'outgoingConnected', label: '内通話数（軒）', type: 'number' },
                        { id: 'outgoingAppointments', label: '内約束（アポイント）数（軒）', type: 'number' },
                        { id: 'outgoingEventVisit', label: 'イベント（軒）', type: 'number' },
                        { id: 'outgoingOtherVisit', label: 'それ以外（軒）', type: 'number' },
                        { id: 'outgoingFamilyPromise', label: '家族約束（軒）', type: 'number' },
                        { id: 'outgoingAvgVisitors', label: '来場平均人数（人）', type: 'number', step: '0.1' }
                    ]
                },
                {
                    title: '受電関連',
                    icon: 'fas fa-phone',
                    fields: [
                        { id: 'incomingCalls', label: '受電数（軒）', type: 'number' },
                        { id: 'incomingAppointments', label: '内約束（アポイント）数（軒）', type: 'number' },
                        { id: 'incomingEventVisit', label: 'イベント（軒）', type: 'number' },
                        { id: 'incomingOtherVisit', label: 'それ以外（軒）', type: 'number' },
                        { id: 'incomingFamilyPromise', label: '家族約束（軒）', type: 'number' },
                        { id: 'incomingAvgVisitors', label: '来場平均人数（人）', type: 'number', step: '0.1' }
                    ]
                },
                {
                    title: '売上',
                    icon: 'fas fa-yen-sign',
                    fields: [
                        { id: 'productSalesOrder', label: '商品売上受注（千円）', type: 'number' },
                        { id: 'productSalesComplete', label: '商品売上完了（千円）', type: 'number' },
                        { id: 'clinicSalesOrder', label: 'クリニック売上受注（千円）', type: 'number' },
                        { id: 'clinicInStoreOrder', label: '内店内売上受注（千円）', type: 'number' },
                        { id: 'clinicInterviewOrder', label: '内問診売上受注（千円）', type: 'number' },
                        { id: 'clinicSalesComplete', label: 'クリニック売上完了（千円）', type: 'number' },
                        { id: 'clinicInStoreComplete', label: '内店内売上完了（千円）', type: 'number' },
                        { id: 'clinicInterviewComplete', label: '内問診売上完了（千円）', type: 'number' }
                    ]
                },
                {
                    title: 'VC',
                    icon: 'fas fa-users',
                    fields: [
                        { id: 'vcTotal', label: 'VC（軒）', type: 'number' },
                        { id: 'vcNewSimultaneous', label: '内新規同時（軒）', type: 'number' },
                        { id: 'vcCC', label: '内CC（軒）', type: 'number' },
                        { id: 'vcLL', label: '内L&L（軒）', type: 'number' },
                        { id: 'vcL', label: '内L（軒）', type: 'number' },
                        { id: 'vcPeople4', label: '内4人（軒）', type: 'number' },
                        { id: 'vcPeople2', label: '内2人（軒）', type: 'number' },
                        { id: 'vcPeople1', label: '内1人（軒）', type: 'number' }
                    ]
                },
                {
                    title: 'FX/CC/純増',
                    icon: 'fas fa-chart-line',
                    fields: [
                        { id: 'fxTotal', label: 'FX（軒）', type: 'number' },
                        { id: 'fxYYX', label: '内YYX（軒）', type: 'number' },
                        { id: 'fxFF', label: '内FF（軒）', type: 'number' },
                        { id: 'fxSubscriptionUPS', label: '内サブスクからのUPS（軒）', type: 'number' },
                        { id: 'joinUnitPrice', label: '加入単価（千円）', type: 'number' },
                        { id: 'ccTotal', label: 'CC（軒）', type: 'number' },
                        { id: 'withdrawalUnitPrice', label: '離脱単価（千円）', type: 'number' },
                        { id: 'netIncrease', label: '純増（軒）', type: 'number' }
                    ]
                },
                {
                    title: 'EX/NX',
                    icon: 'fas fa-exchange-alt',
                    fields: [
                        { id: 'exGroups', label: 'EX（組）', type: 'number' },
                        { id: 'exCases', label: 'EX（件）', type: 'number' },
                        { id: 'productEx', label: '内商品EX（件）', type: 'number' },
                        { id: 'nx', label: 'NX（件）', type: 'number' }
                    ]
                },
                {
                    title: '回線・契約数',
                    icon: 'fas fa-network-wired',
                    fields: [
                        { id: 'lineContractChange', label: '回線、契約数増減（件）', type: 'number' },
                        { id: 'newSimultaneous', label: '内新規同時（件）', type: 'number' },
                        { id: 'withdrawalSimultaneous', label: '内離脱同時（件）', type: 'number' },
                        { id: 'replacement', label: '内入れ替え（件）', type: 'number' }
                    ]
                }
            ]
        };
    }

    getCenterBlockConfig() {
        return {
            sections: [
                {
                    title: '架電関連',
                    icon: 'fas fa-phone-alt',
                    fields: [
                        { id: 'outgoingCalls', label: '架電数（軒）', type: 'number' },
                        { id: 'outgoingConnected', label: '内通話数（軒）', type: 'number' },
                        { id: 'outgoingAppointments', label: '内約束（アポイント）数（軒）', type: 'number' },
                        { id: 'outgoingEventVisit', label: 'イベント（軒）', type: 'number' },
                        { id: 'outgoingOtherVisit', label: 'それ以外（軒）', type: 'number' },
                        { id: 'outgoingFamilyPromise', label: '家族約束（軒）', type: 'number' },
                        { id: 'outgoingAvgVisitors', label: '来場平均人数（人）', type: 'number', step: '0.1' }
                    ]
                },
                {
                    title: '受電関連',
                    icon: 'fas fa-phone',
                    fields: [
                        { id: 'incomingCalls', label: '受電数（軒）', type: 'number' },
                        { id: 'incomingAppointments', label: '内約束（アポイント）数（軒）', type: 'number' },
                        { id: 'incomingEventVisit', label: 'イベント（軒）', type: 'number' },
                        { id: 'incomingOtherVisit', label: 'それ以外（軒）', type: 'number' },
                        { id: 'incomingFamilyPromise', label: '家族約束（軒）', type: 'number' },
                        { id: 'incomingAvgVisitors', label: '来場平均人数（人）', type: 'number', step: '0.1' }
                    ]
                },
                {
                    title: '純増',
                    icon: 'fas fa-chart-line',
                    fields: [
                        { id: 'fxTotal', label: 'FX（軒）', type: 'number' },
                        { id: 'fxVcClub26', label: 'VC:Club26（軒）', type: 'number' },
                        { id: 'fxVcClub25', label: 'VC:Club25（軒）', type: 'number' },
                        { id: 'fxVcOther', label: 'VC:その他（軒）', type: 'number' },
                        { id: 'ccTotal', label: 'CC（軒）', type: 'number' }
                    ]
                },
                {
                    title: 'VC / ClubEX',
                    icon: 'fas fa-users',
                    fields: [
                        { id: 'vcClubExTotal', label: 'VC/ClubEX（軒）', type: 'number' },
                        { id: 'vcClubExFx', label: '内FX（軒）', type: 'number' }
                    ]
                },
                {
                    title: 'VC内訳（当日）',
                    icon: 'fas fa-list-alt',
                    fields: [
                        { id: 'vcMerchantDx', label: '内商店主DX（軒）', type: 'number' },
                        { id: 'vcLifeWorkOnsite', label: '内Life&WorkStyleOnsite（軒）', type: 'number' },
                        { id: 'vcLifeWork', label: '内Life&WorkStyle（軒）', type: 'number' },
                        { id: 'vcLifeStyleOnsite', label: '内LifeStyle&On-site（軒）', type: 'number' },
                        { id: 'vcLifeStyle', label: '内LifeStyle（軒）', type: 'number' },
                        { id: 'vcLOnsite', label: '内L&On-site（軒）', type: 'number' },
                        { id: 'vcLounge', label: '内Lounge（軒）', type: 'number' }
                    ]
                },
                {
                    title: 'VC内訳累計',
                    icon: 'fas fa-user-friends',
                    fields: [
                        { id: 'vcCumulativePeople', label: 'VC内訳累計人数（軒）', type: 'number' },
                        { id: 'vcPeople1', label: '1人（軒）', type: 'number' },
                        { id: 'vcPeople2', label: '2人（軒）', type: 'number' },
                        { id: 'vcPeople4', label: '4人（軒）', type: 'number' }
                    ]
                },
                {
                    title: 'ClubEX + 商品MEXALL',
                    icon: 'fas fa-box',
                    fields: [
                        { id: 'clubExMexall', label: 'ClubEX＋商品MEXALL', type: 'number' }
                    ]
                },
                {
                    title: 'クリニック',
                    icon: 'fas fa-clinic-medical',
                    fields: [
                        { id: 'clinicDayOrder', label: '当日受注（千円）', type: 'number' },
                        { id: 'clinicInStoreOrder', label: '店内（千円）', type: 'number' },
                        { id: 'clinicInterviewOrder', label: '問診（千円）', type: 'number' },
                        { id: 'clinicWhiteInterview', label: '当日白問診枚数（枚）', type: 'number' }
                    ]
                }
            ]
        };
    }

    getWestBlockConfig() {
        return {
            sections: [
                {
                    title: '架電関連',
                    icon: 'fas fa-phone-alt',
                    fields: [
                        { id: 'outgoingCalls', label: '架電数（軒）', type: 'number' },
                        { id: 'outgoingConnected', label: '内通話数（軒）', type: 'number' },
                        { id: 'outgoingAppointments', label: '内約束（アポイント）数（軒）', type: 'number' },
                        { id: 'outgoingEventVisit', label: 'イベント（軒）', type: 'number' },
                        { id: 'outgoingOtherVisit', label: 'それ以外（軒）', type: 'number' },
                        { id: 'outgoingFamilyPromise', label: '家族約束（軒）', type: 'number' },
                        { id: 'outgoingAvgVisitors', label: '来場平均人数（人）', type: 'number', step: '0.1' }
                    ]
                },
                {
                    title: '受電関連',
                    icon: 'fas fa-phone',
                    fields: [
                        { id: 'incomingCalls', label: '受電数（軒）', type: 'number' },
                        { id: 'incomingAppointments', label: '内約束（アポイント）数（軒）', type: 'number' },
                        { id: 'incomingEventVisit', label: 'イベント（軒）', type: 'number' },
                        { id: 'incomingOtherVisit', label: 'それ以外（軒）', type: 'number' },
                        { id: 'incomingFamilyPromise', label: '家族約束（軒）', type: 'number' },
                        { id: 'incomingAvgVisitors', label: '来場平均人数（人）', type: 'number', step: '0.1' }
                    ]
                },
                {
                    title: '売上',
                    icon: 'fas fa-yen-sign',
                    fields: [
                        { id: 'productSalesOrder', label: '商品売上受注（千円）', type: 'number' },
                        { id: 'productSalesComplete', label: '商品売上完了（千円）', type: 'number' },
                        { id: 'clinicSalesOrder', label: 'クリニック売上受注（千円）', type: 'number' },
                        { id: 'clinicInStoreOrder', label: '内店内売上受注（千円）', type: 'number' },
                        { id: 'clinicInterviewOrder', label: '内問診売上受注（千円）', type: 'number' },
                        { id: 'clinicSalesComplete', label: 'クリニック売上完了（千円）', type: 'number' },
                        { id: 'clinicInStoreComplete', label: '内店内売上完了（千円）', type: 'number' },
                        { id: 'clinicInterviewComplete', label: '内問診売上完了（千円）', type: 'number' }
                    ]
                },
                {
                    title: 'VC',
                    icon: 'fas fa-users',
                    fields: [
                        { id: 'vcTotal', label: 'VC（軒）', type: 'number' },
                        { id: 'vcNewSimultaneous', label: '内新規同時（軒）', type: 'number' },
                        { id: 'vcLifeWorkStyle', label: '内Life&WorkStyle（軒）', type: 'number' },
                        { id: 'vcLifeStyle', label: '内Life Style（軒）', type: 'number' },
                        { id: 'vcLO', label: '内LO（軒）', type: 'number' },
                        { id: 'vcCC', label: '内CC（軒）', type: 'number' },
                        { id: 'vcLL', label: '内L&L（軒）', type: 'number' },
                        { id: 'vcL', label: '内L（軒）', type: 'number' },
                        { id: 'vcPeople4', label: '内4人（軒）', type: 'number' },
                        { id: 'vcPeople2', label: '内2人（軒）', type: 'number' },
                        { id: 'vcPeople1', label: '内1人（軒）', type: 'number' }
                    ]
                },
                {
                    title: 'FX/CC/純増',
                    icon: 'fas fa-chart-line',
                    fields: [
                        { id: 'fxTotal', label: 'FX（軒）', type: 'number' },
                        { id: 'fxYYX', label: '内YYX（軒）', type: 'number' },
                        { id: 'fxFF', label: '内FF（軒）', type: 'number' },
                        { id: 'fxSubscriptionUPS', label: '内サブスクからのUPS（軒）', type: 'number' },
                        { id: 'joinUnitPrice', label: '加入単価（千円）', type: 'number' },
                        { id: 'ccTotal', label: 'CC（軒）', type: 'number' },
                        { id: 'withdrawalUnitPrice', label: '離脱単価（千円）', type: 'number' },
                        { id: 'netIncrease', label: '純増（軒）', type: 'number' }
                    ]
                },
                {
                    title: 'EX/NX',
                    icon: 'fas fa-exchange-alt',
                    fields: [
                        { id: 'exGroups', label: 'EX（組）', type: 'number' },
                        { id: 'exCases', label: 'EX（件）', type: 'number' },
                        { id: 'productEx', label: '内商品EX（件）', type: 'number' },
                        { id: 'nx', label: 'NX（件）', type: 'number' }
                    ]
                },
                {
                    title: '回線・契約数',
                    icon: 'fas fa-network-wired',
                    fields: [
                        { id: 'lineContractChange', label: '回線、契約数増減（件）', type: 'number' },
                        { id: 'newSimultaneous', label: '内新規同時（件）', type: 'number' },
                        { id: 'withdrawalSimultaneous', label: '内離脱同時（件）', type: 'number' },
                        { id: 'replacement', label: '内入れ替え（件）', type: 'number' }
                    ]
                }
            ]
        };
    }

    getDCLBlockConfig() {
        const westConfig = this.getWestBlockConfig();
        westConfig.sections.push({
            title: 'ケーズデンキ販売実績',
            icon: 'fas fa-laptop',
            fields: [
                { id: 'ksPcAll', label: 'PCALL（台）', type: 'number' },
                { id: 'ksPcReferral', label: 'KSからの紹介（件）', type: 'number' },
                { id: 'ksPcClinReplacement', label: 'CL問診経由買替（件）', type: 'number' },
                { id: 'ksPcSelfSales', label: 'プランナー自販売（件）', type: 'number' },
                { id: 'ksSmartTabAll', label: 'スマホタブALL（台）', type: 'number' },
                { id: 'ksSmartTabReferral', label: 'KSからの紹介（件）', type: 'number' },
                { id: 'ksSmartTabClinReplacement', label: 'CL問診経由買替（件）', type: 'number' },
                { id: 'ksSmartTabSelfSales', label: 'プランナー自販売（件）', type: 'number' }
            ]
        });
        return westConfig;
    }
}

// アプリケーション初期化
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new DailyReportApp();
});