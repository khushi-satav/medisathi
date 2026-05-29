"""
Medical Spell Corrector — Ported from Model-5 (Python 2 → Python 3)
Uses SymSpell algorithm with Damerau-Levenshtein distance for fast medical term correction.
Trained on medical vocabulary files from the Medical-Prescription-OCR dataset.
"""

import re
import os
import pickle
import time
from pathlib import Path

MAX_EDIT_DISTANCE = 2
VERBOSE = 0  # 0: top suggestion, 1: smallest edit distance, 2: all <= max

# ─── SymSpell Core ───────────────────────────────────────────────

def _get_deletes_list(word: str, max_edit_distance: int = MAX_EDIT_DISTANCE) -> list:
    """Generate all delete variants of a word up to max_edit_distance."""
    deletes = []
    queue = [word]
    for _ in range(max_edit_distance):
        temp_queue = []
        for w in queue:
            if len(w) > 1:
                for c in range(len(w)):
                    word_minus_c = w[:c] + w[c+1:]
                    if word_minus_c not in deletes:
                        deletes.append(word_minus_c)
                    if word_minus_c not in temp_queue:
                        temp_queue.append(word_minus_c)
        queue = temp_queue
    return deletes


def _damerau_levenshtein(seq1: str, seq2: str) -> int:
    """
    Calculate Damerau-Levenshtein distance between two sequences.
    Includes transpositions of consecutive characters.
    O(N*M) time and O(M) space.
    """
    len1, len2 = len(seq1), len(seq2)
    
    # Edge cases
    if len1 == 0:
        return len2
    if len2 == 0:
        return len1
    
    # Use dynamic programming
    oneago = None
    thisrow = list(range(1, len2 + 1)) + [0]
    
    for x in range(len1):
        twoago, oneago, thisrow = oneago, thisrow, [0] * len2 + [x + 1]
        for y in range(len2):
            delcost = oneago[y] + 1
            addcost = thisrow[y - 1] + 1
            subcost = oneago[y - 1] + (seq1[x] != seq2[y])
            thisrow[y] = min(delcost, addcost, subcost)
            # Transpositions
            if (x > 0 and y > 0 and seq1[x] == seq2[y - 1]
                    and seq1[x - 1] == seq2[y] and seq1[x] != seq2[y]):
                thisrow[y] = min(thisrow[y], twoago[y - 2] + 1)
    
    return thisrow[len2 - 1]


# ─── Dictionary Builder ─────────────────────────────────────────

class MedicalSpellCorrector:
    """
    Medical spell corrector using SymSpell algorithm with Damerau-Levenshtein distance.
    Trained on medical/pharmaceutical vocabulary for prescription OCR correction.
    """
    
    def __init__(self, max_edit_distance: int = MAX_EDIT_DISTANCE):
        self.dictionary = {}
        self.longest_word_length = 0
        self.max_edit_distance = max_edit_distance
        self.word_count = 0
        self.unique_word_count = 0
        self._is_trained = False
    
    def _add_entry(self, word: str) -> bool:
        """Add a word and its derived deletions to the dictionary."""
        new_real_word = False
        
        if word in self.dictionary:
            entry = self.dictionary[word]
            self.dictionary[word] = (entry[0], entry[1] + 1)
        else:
            self.dictionary[word] = ([], 1)
            self.longest_word_length = max(self.longest_word_length, len(word))
        
        if self.dictionary[word][1] == 1:
            new_real_word = True
            deletes = _get_deletes_list(word, self.max_edit_distance)
            for item in deletes:
                if item in self.dictionary:
                    self.dictionary[item][0].append(word)
                else:
                    self.dictionary[item] = ([word], 0)
        
        return new_real_word
    
    def train_from_file(self, filepath: str) -> dict:
        """Train the dictionary from a text file (one term per line or words in lines)."""
        total = 0
        unique = 0
        
        print(f"  📖 Loading vocabulary from: {os.path.basename(filepath)}")
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                words = re.findall(r'[a-z]+', line.lower())
                for word in words:
                    if len(word) >= 2:  # Skip single chars
                        total += 1
                        if self._add_entry(word):
                            unique += 1
        
        self.word_count += total
        self.unique_word_count += unique
        print(f"    → {total:,} words processed, {unique:,} unique entries added")
        return {"total": total, "unique": unique}
    
    def train_from_word_list(self, words: list) -> dict:
        """Train from a list of words directly."""
        total = 0
        unique = 0
        for word in words:
            word = word.lower().strip()
            if len(word) >= 2:
                total += 1
                if self._add_entry(word):
                    unique += 1
        self.word_count += total
        self.unique_word_count += unique
        return {"total": total, "unique": unique}
    
    def get_suggestions(self, word: str, silent: bool = True) -> list:
        """Get spelling suggestions for a word."""
        word = word.lower()
        
        if (len(word) - self.longest_word_length) > self.max_edit_distance:
            return []
        
        suggest_dict = {}
        min_suggest_len = float('inf')
        queue = [word]
        q_dictionary = {}
        
        while len(queue) > 0:
            q_item = queue[0]
            queue = queue[1:]
            
            # Early exit
            if (VERBOSE < 2) and len(suggest_dict) > 0 and \
               (len(word) - len(q_item)) > min_suggest_len:
                break
            
            if q_item in self.dictionary and q_item not in suggest_dict:
                if self.dictionary[q_item][1] > 0:
                    suggest_dict[q_item] = (
                        self.dictionary[q_item][1],
                        len(word) - len(q_item)
                    )
                    if (VERBOSE < 2) and (len(word) == len(q_item)):
                        break
                    elif (len(word) - len(q_item)) < min_suggest_len:
                        min_suggest_len = len(word) - len(q_item)
                
                for sc_item in self.dictionary[q_item][0]:
                    if sc_item not in suggest_dict:
                        item_dist = _damerau_levenshtein(sc_item, word)
                        
                        if (VERBOSE < 2) and (item_dist > min_suggest_len):
                            pass
                        elif item_dist <= self.max_edit_distance:
                            suggest_dict[sc_item] = (
                                self.dictionary[sc_item][1],
                                item_dist
                            )
                            if item_dist < min_suggest_len:
                                min_suggest_len = item_dist
                        
                        if VERBOSE < 2:
                            suggest_dict = {
                                k: v for k, v in suggest_dict.items()
                                if v[1] <= min_suggest_len
                            }
            
            if (VERBOSE < 2) and ((len(word) - len(q_item)) > min_suggest_len):
                pass
            elif (len(word) - len(q_item)) < self.max_edit_distance and len(q_item) > 1:
                for c in range(len(q_item)):
                    word_minus_c = q_item[:c] + q_item[c+1:]
                    if word_minus_c not in q_dictionary:
                        queue.append(word_minus_c)
                        q_dictionary[word_minus_c] = None
        
        as_list = list(suggest_dict.items())
        outlist = sorted(as_list, key=lambda item: (item[1][1], -item[1][0]))
        
        if VERBOSE == 0:
            return outlist[:1] if outlist else []
        return outlist
    
    def correct_word(self, word: str) -> str:
        """Correct a single word. Returns the best suggestion or the original word."""
        if not word or len(word) < 2:
            return word
        
        suggestions = self.get_suggestions(word)
        if suggestions:
            return suggestions[0][0]
        return word
    
    def correct_text(self, text: str) -> str:
        """Correct all words in a text string."""
        words = re.findall(r'[a-zA-Z]+|[^a-zA-Z]+', text)
        corrected = []
        for w in words:
            if w[0].isalpha():
                corrected_word = self.correct_word(w.lower())
                # Preserve original casing pattern
                if w[0].isupper():
                    corrected_word = corrected_word.capitalize()
                corrected.append(corrected_word)
            else:
                corrected.append(w)
        return ''.join(corrected)
    
    def save(self, filepath: str):
        """Save the trained dictionary to a pickle file."""
        data = {
            'dictionary': self.dictionary,
            'longest_word_length': self.longest_word_length,
            'max_edit_distance': self.max_edit_distance,
            'word_count': self.word_count,
            'unique_word_count': self.unique_word_count,
        }
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'wb') as f:
            pickle.dump(data, f, protocol=pickle.HIGHEST_PROTOCOL)
        self._is_trained = True
        print(f"  💾 Dictionary saved to {filepath}")
    
    @classmethod
    def load(cls, filepath: str) -> 'MedicalSpellCorrector':
        """Load a trained dictionary from a pickle file."""
        corrector = cls()
        with open(filepath, 'rb') as f:
            data = pickle.load(f)
        corrector.dictionary = data['dictionary']
        corrector.longest_word_length = data['longest_word_length']
        corrector.max_edit_distance = data['max_edit_distance']
        corrector.word_count = data['word_count']
        corrector.unique_word_count = data['unique_word_count']
        corrector._is_trained = True
        return corrector
    
    @property
    def is_trained(self) -> bool:
        return self._is_trained and len(self.dictionary) > 0
    
    def stats(self) -> dict:
        return {
            "dictionary_size": len(self.dictionary),
            "total_words_processed": self.word_count,
            "unique_entries": self.unique_word_count,
            "longest_word": self.longest_word_length,
            "max_edit_distance": self.max_edit_distance,
            "is_trained": self.is_trained,
        }
