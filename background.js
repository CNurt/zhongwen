/*
        Zhongwen - Ein Chinesisch-Deutsch Popup-Wörterbuch
        Copyright (C) 2011-2013 Christian Schiller
        German version of the Chinese-English Zhongwen Popup-Dictionary
        https://chrome.google.com/webstore/detail/kkmlkkjojmombglmlpbpapmhcaljjkde
        Modified work Copyright (C) 2018 Leonard Lausen
        https://github.com/leezu/zhongwen
*/

browser.runtime.onMessage.addListener(function(request, sender, response) {
    switch(request.type) {
        case 'enable?':
            // When a page first loads, checks to see if it should enable script
            zhongwenMain.onTabSelect(sender.tab.id);
            break;

        case 'search':
            var e = zhongwenMain.search(request.text);
            return Promise.resolve(e);

        case 'open':
            var tabID = zhongwenMain.tabIDs[request.tabType];
            if (tabID) {
                chrome.tabs.get(tabID, function(tab) {
                    if (tab && (tab.url.substr(-13) == 'wordlist.html')) {
                        chrome.tabs.reload(tabID);
                        chrome.tabs.update(tabID, {
                            active: true
                        });
                    } else {
                        chrome.tabs.create({
                            url: request.url
                            }, function(tab) {
                            zhongwenMain.tabIDs[request.tabType] = tab.id;
                            if (request.tabType == 'wordlist') {
                                // make sure the table is sized correctly
                                chrome.tabs.reload(tab.id);
                            }
                        });
                    }
                });
            } else {
                chrome.tabs.create({
                    url: request.url
                    }, function(tab) {
                    zhongwenMain.tabIDs[request.tabType] = tab.id;
                    if (request.tabType == 'wordlist') {
                        // make sure the table is sized correctly
                        chrome.tabs.reload(tab.id);
                    }
                });
            }

            break;

        case 'add':
            var json = localStorage['wordlist'];

            var wordlist;
            if (json) {
                wordlist = JSON.parse(json);
            } else {
                wordlist = [];
            }

            for (var i in request.entries) {

                var entry = {};
                entry.simplified = request.entries[i].simplified;
                entry.traditional = request.entries[i].traditional;
                entry.pinyin = request.entries[i].pinyin;
                entry.definition = request.entries[i].definition;

                wordlist.push(entry);
            }
            localStorage['wordlist'] = JSON.stringify(wordlist);

            tabID = zhongwenMain.tabIDs['wordlist'];
            if (tabID) {
                chrome.tabs.get(tabID, function(tab) {
                    if (tab) {
                        chrome.tabs.reload(tabID);
                    }
                });
            }

            break;
        default:
            // ignore
    }
});

browser.browserAction.onClicked.addListener(zhongwenMain.enableToggle)
browser.tabs.onActivated.addListener(zhongwenMain.onTabActivated)
browser.tabs.onUpdated.addListener(zhongwenMain.onTabUpdated)

let enabledPromise = browser.storage.local.get({enabled: 0})
Promise.all([enabledPromise]).then(([storage]) => {
    var tab // Can't retrieve tab object in background script
    if (storage.enabled === 1) {
        zhongwenMain.enable(tab)
        browser.browserAction.setBadgeBackgroundColor({
            'color': [255, 0, 0, 255]
        })

        browser.browserAction.setBadgeText({
            'text': 'On'
        })
    }
})

browser.contextMenus.create({
    title: 'Open word list',
    id: 'wordlist-browser_action',
    onclick: zhongwenMain.wordlistTab,
    contexts: ['browser_action']
})

browser.contextMenus.create({
    title: 'options',
    id: 'options-browser_action',
    onclick: zhongwenMain.optionsTab,
    contexts: ['browser_action']
})
