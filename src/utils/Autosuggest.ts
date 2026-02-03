
export class TrieNode {
    children: Map<string, TrieNode>;
    isEndOfWord: boolean;
    frequency: number;

    constructor() {
        this.children = new Map();
        this.isEndOfWord = false;
        this.frequency = 0;
    }
}

export class Autosuggest {
    root: TrieNode;
    maxSuggestions: number;

    constructor(maxSuggestions: number = 5) {
        this.root = new TrieNode();
        this.maxSuggestions = maxSuggestions;
    }

    insert(word: string): void {
        if (!word) return;
        let current = this.root;
        for (const char of word) {
            if (!current.children.has(char)) {
                current.children.set(char, new TrieNode());
            }
            current = current.children.get(char)!;
        }
        current.isEndOfWord = true;
        current.frequency++;
    }

    search(prefix: string): string[] {
        if (!prefix) return [];
        let current = this.root;
        for (const char of prefix) {
            if (!current.children.has(char)) {
                return [];
            }
            current = current.children.get(char)!;
        }
        return this._collectSuggestions(current, prefix);
    }

    private _collectSuggestions(node: TrieNode, prefix: string): string[] {
        const results: { word: string, freq: number }[] = [];

        const traverse = (curr: TrieNode, str: string) => {
            if (curr.isEndOfWord) {
                results.push({ word: str, freq: curr.frequency });
            }
            for (const [char, child] of curr.children) {
                traverse(child, str + char);
            }
        };

        traverse(node, prefix);

        // Sort by frequency descending and limit
        return results
            .sort((a, b) => b.freq - a.freq)
            .slice(0, this.maxSuggestions)
            .map(r => r.word);
    }

    loadDefaults(commands: string[]) {
        commands.forEach(cmd => this.insert(cmd));
    }
}
