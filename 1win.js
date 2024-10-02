const fs = require('fs');
const path = require('path');
const axios = require('axios');
const readline = require('readline');
const colors = require('colors');

class OneWin {
    constructor() {
        this.headers = {
            Accept: 'application/json, text/plain, */*',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Accept-Language': 'en-GB,en;q=0.9,en-US;q=0.8,ja;q=0.7',
            Origin: 'https://cryptocklicker-frontend-rnd-prod.100hp.app',
            Referer: 'https://cryptocklicker-frontend-rnd-prod.100hp.app/',
            'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36 Edg/129.0.0.0',
        };

        this.authUrl = 'https://crypto-clicker-backend-go-prod.100hp.app/game/start'
    }

    header(userId, token) {
        if (userId) {
            this.headers['x-user-id'] = userId;
        }

        if (token) {
            this.headers['Authorization'] = `Bearer ${token}`;
        }

        return this.headers;
    }

    async countdown(t) {
        for (let i = t; i > 0; i--) {
            const hours = String(Math.floor(i / 3600)).padStart(2, '0');
            const minutes = String(Math.floor((i % 3600) / 60)).padStart(2, '0');
            const seconds = String(i % 60).padStart(2, '0');
            process.stdout.write(colors.white(`[*] Cần chờ ${hours}:${minutes}:${seconds}     \r`));
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        process.stdout.write('                                        \r');
    }

    log(msg, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        switch(type) {
            case 'success':
                console.log(`[${timestamp}] [*] ${msg}`.green);
                break;
            case 'custom':
                console.log(`[${timestamp}] [*] ${msg}`.magenta);
                break;        
            case 'error':
                console.log(`[${timestamp}] [!] ${msg}`.red);
                break;
            case 'warning':
                console.log(`[${timestamp}] [*] ${msg}`.yellow);
                break;
            default:
                console.log(`[${timestamp}] [*] ${msg}`);
        }
    }

    async waitWithCountdown(seconds) {
        for (let i = seconds; i >= 0; i--) {
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`===== Đã hoàn thành tất cả tài khoản, chờ ${i} giây để tiếp tục vòng lặp =====`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('');
    }

    async decodeData(initData) {
        const urlParams = new URLSearchParams(initData);
        const user = JSON.parse(decodeURIComponent(urlParams.get('user')));
        return {
            auth_date: urlParams.get('auth_date'),
            hash: urlParams.get('hash'),
            query_id: urlParams.get('query_id'),
            chat_instance: urlParams.get('chat_instance'),
            user: user,
            userEncoded: encodeURIComponent(urlParams.get('user'))
        };
    }

    async auth(userData) {
        const headers = this.header(userData.user.id);

        try {
            let url = `${this.authUrl}?user=${userData.userEncoded}&chat_instance=${userData.chat_instance}&chat_type=sender&auth_date=${userData.auth_date}&hash=${userData.hash}`;
            const res = await axios.post(url, {}, { headers: {...headers, 'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundaryuKQH46UyoMDoADk1'} });

            return res.data;
        } catch (error) {
            if (error.response.status === 401) {
                const FormData = require('form-data');
                let data = new FormData();
                data.append('referrer_tg_id', '673750261');

                let url = `${this.authUrl}?user=${userData.userEncoded}&chat_instance=${userData.chat_instance}&start_param=refId673750261&auth_date=${userData.auth_date}&hash=${userData.hash}`;
                const res = await axios.post(url, {}, { headers: {...headers, 'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundaryuKQH46UyoMDoADk1'} });

                return res.data;
            }

            this.log(`Đã xảy ra lỗi: ${error}`, 'error');
        }
    }

    async tap(authToken) {
        try {
            if (authToken.currentEnergy >= authToken.energyLimit) {
                const headers = this.header(authToken.tgId, authToken.token);

                const res = await axios.post('https://crypto-clicker-backend-go-prod.100hp.app/tap', {
                    "tapsCount": authToken.currentEnergy
                }, { headers: {...headers, 'Content-Type': 'application/json'} });

                if (res.status === 200) {
                    this.log(`Đã tap ${authToken.currentEnergy} lần`, 'success');
                } else {
                    this.log(`Không thể tap thành công`, 'warning');
                }
            } else {
                this.log(`Không đủ năng lượng`, 'warning');
            }
        } catch (error) {
            this.log(`Đã xảy ra lỗi khi tap: ${error}`, 'error');
        }
    }

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const initDataList = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        while (true) {
            for (let no = 0; no < initDataList.length; no++) {
                const initData = initDataList[no];
                const userData = await this.decodeData(initData);

                const firstName = userData.user.first_name;
                console.log(`========== Tài khoản ${no + 1} | ${firstName.green} ==========`);

                try {
                    const authToken = await this.auth(userData);
                    
                    if (authToken) {
                        await this.tap(authToken);
                        await this.countdown(10);
                    }
                } catch (error) {
                    this.log(`Đã xảy ra lỗi: ${error}`, 'error');
                }
            }

            await this.waitWithCountdown(200);
        }
    }
}

if (require.main === module) {
    const onewin = new OneWin();
    onewin.main().catch(err => {
        console.error(err);
        process.exit(1);
    });
}