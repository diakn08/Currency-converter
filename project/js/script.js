class CurrencyConverter {
    constructor() {
        this.API_KEY = "8908c1e14f9a2e116521e102";
        this.initializeElements();
        this.setupEventListeners();
        this.loadCurrencies();
        // Format initial values
        this.formatInitialValues();

        // ✅ Проверка API при запуске
        this.testAPI();
    }

    initializeElements() {
        this.amountInput = document.getElementById('amount');
        this.convertedAmountInput = document.getElementById('converted-amount');
        this.fromCurrencySelect = document.getElementById('from-currency');
        this.toCurrencySelect = document.getElementById('to-currency');
        this.fromFlag = document.getElementById('from-flag');
        this.toFlag = document.getElementById('to-flag');
        this.rateInfo = document.getElementById('rate-info');
        this.swapButton = document.getElementById('swap-currencies');

        this.currentRates = {};
        this.isLoading = false;
        this.allCurrencies = [];
    }

    formatInitialValues() {
        this.amountInput.value = "1,000.00";
        this.convertedAmountInput.value = "736.70";
    }

    setupEventListeners() {
        this.amountInput.addEventListener('input', (e) => this.handleAmountInput(e));
        this.amountInput.addEventListener('blur', () => this.formatAmount());
        this.fromCurrencySelect.addEventListener('change', () => this.handleCurrencyChange());
        this.toCurrencySelect.addEventListener('change', () => this.handleCurrencyChange());
        this.swapButton.addEventListener('click', () => this.swapCurrencies());
        
        this.amountInput.addEventListener('focus', function() {
            this.select();
        });
    }

    handleAmountInput(e) {
        let value = e.target.value.replace(/,/g, '');
        value = value.replace(/[^0-9.]/g, '');
        const decimalCount = value.split('.').length - 1;
        if (decimalCount > 1) value = value.substring(0, value.lastIndexOf('.'));
        if (value.includes('.')) {
            const parts = value.split('.');
            if (parts[1].length > 2) value = parts[0] + '.' + parts[1].substring(0, 2);
        }
        e.target.value = value;
        this.convert();
    }

    formatAmount() {
        let value = this.amountInput.value.replace(/,/g, '');
        if (value === '' || isNaN(value) || value === '.') value = '0';
        const num = parseFloat(value);
        if (isNaN(num)) {
            this.amountInput.value = '0.00';
            return;
        }
        this.amountInput.value = num.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            useGrouping: true
        });
        this.convert();
    }

    async loadCurrencies() {
        try {
            const response = await fetch(`https://v6.exchangerate-api.com/v6/${this.API_KEY}/codes`);
            const data = await response.json();
            if (data.result === "success") {
                const codes = data.supported_codes;
                codes.sort((a, b) => a[1].localeCompare(b[1]));
                this.allCurrencies = codes;
                this.populateCurrencySelects(codes);
                this.setInitialCurrencies();
                await this.fetchExchangeRates(this.fromCurrencySelect.value);
                this.convert();
            } else {
                throw new Error('Failed to load currencies');
            }
        } catch (error) {
            console.error('Error loading currencies:', error);
            this.useFallbackCurrencies();
        }
    }

    populateCurrencySelects(codes) {
        this.fromCurrencySelect.innerHTML = '';
        this.toCurrencySelect.innerHTML = '';
        codes.forEach(([code, name]) => {
            const option1 = document.createElement("option");
            const option2 = document.createElement("option");
            option1.value = option2.value = code;
            option1.textContent = option2.textContent = code;
            this.fromCurrencySelect.appendChild(option1);
            this.toCurrencySelect.appendChild(option2);
        });
    }

    setInitialCurrencies() {
        const sgdIndex = Array.from(this.fromCurrencySelect.options).findIndex(option => option.value === 'SGD');
        const usdIndex = Array.from(this.toCurrencySelect.options).findIndex(option => option.value === 'USD');
        if (sgdIndex !== -1) this.fromCurrencySelect.selectedIndex = sgdIndex;
        if (usdIndex !== -1) this.toCurrencySelect.selectedIndex = usdIndex;
    }

    async convert() {
        const amountStr = this.amountInput.value.replace(/,/g, '');
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount < 0) {
            this.convertedAmountInput.value = "0.00";
            return;
        }
        const from = this.fromCurrencySelect.value;
        const to = this.toCurrencySelect.value;
        if (!this.currentRates[from]) {
            this.convertedAmountInput.value = "Loading...";
            return;
        }
        const rate = this.currentRates[from][to];
        if (rate) {
            const convertedAmount = amount * rate;
            this.convertedAmountInput.value = convertedAmount.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
                useGrouping: convertedAmount >= 1000
            });
            this.updateRateDisplay(from, to, rate);
        } else {
            this.convertedAmountInput.value = "0.00";
        }
    }

    async fetchExchangeRates(baseCurrency) {
        if (this.isLoading) return;
        this.isLoading = true;
        try {
            const response = await fetch(`https://v6.exchangerate-api.com/v6/${this.API_KEY}/latest/${baseCurrency}`);
            if (response.ok) {
                const data = await response.json();
                if (data.result === "success") {
                    this.currentRates[baseCurrency] = data.conversion_rates;
                    this.convert();
                } else {
                    throw new Error(data["error-type"]);
                }
            } else {
                throw new Error('API request failed');
            }
        } catch (error) {
            console.warn('API error:', error);
            this.useFallbackRates(baseCurrency);
            this.convert();
        } finally {
            this.isLoading = false;
        }
    }

    async handleCurrencyChange() {
        const fromCurrency = this.fromCurrencySelect.value;
        const toCurrency = this.toCurrencySelect.value;
        this.updateFlag(this.fromFlag, fromCurrency);
        this.updateFlag(this.toFlag, toCurrency);
        await this.fetchExchangeRates(fromCurrency);
    }

    updateFlag(flagElement, currencyCode) {
        const flagUrls = {
            'USD': 'https://flagcdn.com/w80/us.png', 'EUR': 'https://flagcdn.com/w80/eu.png',
            'GBP': 'https://flagcdn.com/w80/gb.png', 'JPY': 'https://flagcdn.com/w80/jp.png',
            'SGD': 'https://flagcdn.com/w80/sg.png', 'AUD': 'https://flagcdn.com/w80/au.png',
            'CAD': 'https://flagcdn.com/w80/ca.png', 'CHF': 'https://flagcdn.com/w80/ch.png',
            'CNY': 'https://flagcdn.com/w80/cn.png', 'RUB': 'https://flagcdn.com/w80/ru.png',
            'INR': 'https://flagcdn.com/w80/in.png', 'BRL': 'https://flagcdn.com/w80/br.png',
            'MXN': 'https://flagcdn.com/w80/mx.png', 'KRW': 'https://flagcdn.com/w80/kr.png',
            'TRY': 'https://flagcdn.com/w80/tr.png', 'ZAR': 'https://flagcdn.com/w80/za.png',
            'NZD': 'https://flagcdn.com/w80/nz.png', 'SEK': 'https://flagcdn.com/w80/se.png',
            'NOK': 'https://flagcdn.com/w80/no.png', 'DKK': 'https://flagcdn.com/w80/dk.png',
            'PLN': 'https://flagcdn.com/w80/pl.png', 'THB': 'https://flagcdn.com/w80/th.png',
            'MYR': 'https://flagcdn.com/w80/my.png', 'IDR': 'https://flagcdn.com/w80/id.png',
            'PHP': 'https://flagcdn.com/w80/ph.png', 'CZK': 'https://flagcdn.com/w80/cz.png',
            'ILS': 'https://flagcdn.com/w80/il.png', 'CLP': 'https://flagcdn.com/w80/cl.png',
            'AED': 'https://flagcdn.com/w80/ae.png', 'SAR': 'https://flagcdn.com/w80/sa.png',
            'HKD': 'https://flagcdn.com/w80/hk.png', 'TWD': 'https://flagcdn.com/w80/tw.png'
        };
        if (!flagUrls[currencyCode]) {
            const region = currencyCode.substring(0, 2).toLowerCase();
            flagUrls[currencyCode] = `https://flagcdn.com/w80/${region}.png`;
        }
        const img = flagElement.querySelector('img');
        if (img) {
            img.src = flagUrls[currencyCode];
            img.alt = currencyCode;
        } else {
            const newImg = document.createElement('img');
            newImg.src = flagUrls[currencyCode];
            newImg.alt = currencyCode;
            flagElement.innerHTML = '';
            flagElement.appendChild(newImg);
        }
    }

    async swapCurrencies() {
        const tempCurrency = this.fromCurrencySelect.value;
        this.fromCurrencySelect.value = this.toCurrencySelect.value;
        this.toCurrencySelect.value = tempCurrency;
        await this.handleCurrencyChange();
    }

    updateRateDisplay(from, to, rate) {
        if (rate && !isNaN(rate)) {
            this.rateInfo.textContent = `1 ${from} = ${rate.toFixed(4)} ${to}`;
        } else {
            this.rateInfo.textContent = `1 ${from} = Loading...`;
        }
    }

    useFallbackCurrencies() {
        const fallbackCurrencies = [
            ['USD', 'US Dollar'], ['EUR', 'Euro'], ['GBP', 'British Pound'],
            ['JPY', 'Japanese Yen'], ['SGD', 'Singapore Dollar'],
            ['AUD', 'Australian Dollar'], ['CAD', 'Canadian Dollar'],
            ['CHF', 'Swiss Franc'], ['CNY', 'Chinese Yuan'],
            ['INR', 'Indian Rupee'], ['RUB', 'Russian Ruble']
        ];
        this.populateCurrencySelects(fallbackCurrencies);
        this.setInitialCurrencies();
        this.useFallbackRates('SGD');
    }

    useFallbackRates(baseCurrency) {
        const fallbackRates = {
            'USD': { 'SGD': 1.3567, 'EUR': 0.8515, 'GBP': 0.7345, 'JPY': 110.25, 'AUD': 1.5367, 'CAD': 1.3562, 'CHF': 0.8999, 'CNY': 7.2345, 'INR': 74.50, 'RUB': 73.50 },
            'SGD': { 'USD': 0.7367, 'EUR': 0.6275, 'GBP': 0.5412, 'JPY': 81.25, 'AUD': 1.1324, 'CAD': 0.9998, 'CHF': 0.6632, 'CNY': 5.3321, 'INR': 54.87, 'RUB': 54.15 },
            'EUR': { 'USD': 1.1742, 'SGD': 1.5935, 'GBP': 0.8623, 'JPY': 129.45, 'AUD': 1.6723, 'CAD': 1.4756, 'CHF': 0.9567, 'CNY': 7.8567, 'INR': 87.50, 'RUB': 86.30 },
            'GBP': { 'USD': 1.3615, 'SGD': 1.8478, 'EUR': 1.1595, 'JPY': 150.12, 'AUD': 1.9387, 'CAD': 1.7109, 'CHF': 1.1098, 'CNY': 9.1123, 'INR': 101.45, 'RUB': 100.10 },
            'JPY': { 'USD': 0.00907, 'SGD': 0.01231, 'EUR': 0.00772, 'GBP': 0.00666, 'AUD': 0.01393, 'CAD': 0.01229, 'CHF': 0.00797, 'CNY': 0.06548, 'INR': 0.6755, 'RUB': 0.6667 }
        };
        if (fallbackRates[baseCurrency]) this.currentRates[baseCurrency] = fallbackRates[baseCurrency];
        else this.currentRates[baseCurrency] = { 'USD': 1 };
    }

    // ✅ Новый метод: проверка API
    async testAPI() {
        try {
            const codesResponse = await fetch(`https://v6.exchangerate-api.com/v6/${this.API_KEY}/codes`);
            const codesData = await codesResponse.json();
            if (codesData.result === "success") {
                console.log("✅ API возвращает список валют:", codesData.supported_codes);
            } else {
                console.warn("⚠ API не вернул список валют:", codesData);
            }

            const ratesResponse = await fetch(`https://v6.exchangerate-api.com/v6/${this.API_KEY}/latest/SGD`);
            const ratesData = await ratesResponse.json();
            if (ratesData.result === "success") {
                console.log("✅ API возвращает курсы для SGD:", ratesData.conversion_rates);
            } else {
                console.warn("⚠ API не вернул курсы:", ratesData);
            }
        } catch (error) {
            console.error("❌ Ошибка при проверке API:", error);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CurrencyConverter();
});
