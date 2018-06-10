/*
        Zhongwen - A Chinese-English Popup Dictionary
        Original work Copyright (C) 2012 Christian Schiller
        Modified work Copyright (C) 2017 Leonard Lausen
        https://chrome.google.com/extensions/detail/kkmlkkjojmombglmlpbpapmhcaljjkde
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

browser.browserAction.onClicked.addListener(zhongwenMain.enableToggle);
browser.tabs.onActivated.addListener(zhongwenMain.onTabActivated);
browser.tabs.onUpdated.addListener(zhongwenMain.onTabUpdated);

let enabledPromise = browser.storage.local.get({enabled: 0}); //this is only used after re-/start of browser or extension
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
});

browser.contextMenus.create({ // top icon
  title: 'word list',
  id: 'wordlist-browser_action',
  onclick: zhongwenMain.wordlistTab,
  contexts: ['browser_action']
});

browser.contextMenus.create({ // top icon
  title: 'options',
  id: 'options-browser_action',
  onclick: zhongwenMain.optionsTab,
  contexts: ['browser_action']
});

browser.contextMenus.create({ // top icon
  title: 'swap Language',
  id: 'swapLang-browser_action',
  // onclick: zhongwenMain.enable(function(sender){return browser.tabs.get(tabId)}),
//   onclick: zhongwenMain.enable(tab),//zhongwenMain.enable(sender.tab), //TODO fix FIX .id
  contexts: ['browser_action']
});

browser.contextMenus.onClicked.addListener(function(info, tab) {
    if (info.menuItemId == 'swapLang-browser_action') {
      zhongwenMain.swapLang();
    }
});

browser.storage.onChanged.addListener(
  (changes, area) => {
    // listens to changes in options.dictlanguage and then reloads the other dictionary
    if ((area == 'sync') && (changes.options.newValue.dictlanguage !== changes.options.oldValue.dictlanguage)) {
      browser.storage.local.get()
      .then((storage) => {
        if (storage.enabled == 1)
            browser.tabs.getCurrent()
            .then((tabInfo) => { zhongwenMain.reloadDict(tabInfo); });
      });
  }}
);

function getActiveTab() {
  // returns Pormise
  return browser.tabs.query({ currentWindow: true, active: true })
      .then(function (tabs) { return tabs[0] });
};