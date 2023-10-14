function getwords(type) {
    let number =
        Math.floor(Math.random() * ((type === 'words' ? 60 : 119) + 1));
    let url = `https://raw.githubusercontent.com/linjan2/data/main/${type}/${
        number}.json`;
    return fetch(url)
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                console.error(response);
                throw new Error(response);
            }
        })
        .catch(() => {
            return new Promise(resolve => resolve(
      type === 'words' ? ["clod","blossoming","diners","mammography","tranquilliser","brow","hovers","ambiguities","construing","strive","cogency","outmanoeuvres","granary","derives","impassivity","browse","fungicide","popularizing","dunes","sailors"] : ["radionyheter", "grätten", "stöttålig", "hänryckning", "radiokontakt", "filklove", "slingring", "systemering", "blankofullmakt", "kvinnoperspektiv", "utanpåsittande", "järnvägare", "islam", "nyckelbiotop", "skärgårdstrafik", "produktionsstart", "anlöpning", "slöseri", "återupprepa", "belamring"]
      ));
        });
}

function fetchDefinition(word) {
    const url = `https://api.wordnik.com/v4/word.json/${
        word}/definitions?limit=1&includeRelated=false&sourceDictionaries=wiktionary&useCanonical=false&includeTags=false&api_key=br9ptmduqtp65ajnmis68uie4mo42twn92nr6j44z7s1ygznf`;
    return fetch(url,
                 {method : "GET", headers : {"Accept" : "application/json"}})
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                console.error(response);
                throw new Error(response);
            }
        })
        .then((arr) => {
            let obj = null;
            if (arr[0] && arr[0].text && arr[0].text.length) {
                obj = arr[0];
                const span = document.createElement("span");
                span.innerHTML = obj.text;
                obj.text = span.innerText;
            }
            return new Promise(resolve => resolve(obj));
        })
        .catch(() => { return new Promise(resolve => resolve(null)); });
}
function shuffle(array) {
    const len = array.length;
    for (let i = len - 1, r; i >= 0; i -= 1) {
        r = Math.floor(Math.random() * (i + 1));
        let x = array[i];
        array[i] = array[r];
        array[r] = x;
    }
}

PetiteVue
    .createApp({
        solved : false,
        word : [],
        answer : "",
        words : [],
        wordindex : 0,
        letters : [],
        input : "",
        definition : null,
        playing : false,
        type : "words",
        currentType : "words",
        select() {
            let that = this;
            setTimeout(() => { that.reload(); }, 0);
        },
        reload() {
            let that = this;
            this.letters = [];
            this.input = "";
            this.solved = false;
            // delay setting definition=null to first disable rendering with
            // v-if
            new Promise(resolve => resolve())
                .then(() => that.definition = null);
            let index = this.wordindex;
            index += 1;
            if (this.type != this.currentType || index >= this.words.length) {
                this.currentType = this.type;
                this.wordindex = 0;
                getwords(this.type).then(newwords => {
                    shuffle(newwords);
                    that.words = newwords;
                    that.answer = newwords[0];
                    that.word = [...that.answer ];
                    that.freqs = that.word.reduce((accum, current) => {
                        accum[current] = (accum[current] + 1) || 1;
                        return accum;
                    }, {});
                });
            } else {
                this.wordindex = index;
                this.answer = this.words[index];
                this.word = [...this.answer ];
                this.freqs = this.word.reduce((accum, current) => {
                    accum[current] = (accum[current] + 1) || 1;
                    return accum;
                }, {});
            }
        },
        add(text) {
            let word = this.word; // character array
            if (!this.solved && text.length === word.length) {
                text = text.toLowerCase()
                           .padEnd(word.length, ' ')
                           .substring(0, word.length);
                let input = [...text ];
                let letters = [];
                let freqs = Object.assign({}, this.freqs);

                // add letters and check correctly placed letters
                for (let i = 0; i < input.length; i += 1) {
                    let c = "";
                    let ch1 = input[i], ch2 = word[i];
                    if (ch1 === ch2) {
                        c = "letter-correct";
                        freqs[ch1] -= 1;
                    }
                    letters.push({l : ch1, c : c});
                }
                // check correct letters incorrectly placed
                for (let i = 0; i < input.length; i += 1) {
                    let ch = input[i];
                    if (freqs[ch] > 0 && letters[i].c === "") {
                        freqs[ch] -= 1;
                        letters[i].c = "letter-includes";
                    }
                }

                this.letters.push(letters);

                if (text === this.answer) {
                    this.solved = true;
                    // fetch english definition
                    if (this.currentType === "words") {
                        fetchDefinition(text).then(
                            definition => this.definition = definition);
                    }
                }
                this.input = "";
            }
        }
    })
    .mount("#word-app");
