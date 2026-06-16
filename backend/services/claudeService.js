const Groq = require('groq-sdk');
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

async function callAI(prompt, maxTokens = 1500) {
    const response = await client.chat.completions.create({
        model: MODEL, max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
    });
    return response.choices[0].message.content;
}

// ─────────────────────────────────────────────────────────────────────────────
// BEGINNER-FRIENDLY PROBLEM BANK
//
// Philosophy:
//   • Each problem shows EXACTLY what input will come from stdin and what
//     should be printed to stdout — no function signatures, no *args.
//   • testCases.stdin  = the text piped into the program (what input() reads)
//   • testCases.expected = the exact string that must be printed to stdout
//   • starterCode shows the pattern for reading input and printing output
//     in each default language (Python shown; JS shown inline in interview.html)
// ─────────────────────────────────────────────────────────────────────────────

const PROBLEM_BANK = {

    reverseString: {
        title: 'Reverse a String',
        difficulty: 'easy',
        description:
`You are given a single line of text on standard input.
Print the characters of that line in reverse order.

Input format:  one line of text
Output format: the reversed text on one line

Example
  Input:  hello
  Output: olleh`,
        constraints: ['1 ≤ length of string ≤ 1000', 'String contains printable ASCII characters'],
        examples: [
            { input: 'hello',  output: 'olleh' },
            { input: 'Hannah', output: 'hannaH' },
        ],
        functionSignature: null,
        starterCode: {
            python:
`# Read a line of input
s = input()

# TODO: reverse s and print it
print(s)           # replace this line with your solution`,

            javascript:
`// Read a line from stdin
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });

rl.on('line', (s) => {
    // TODO: reverse s and print it
    console.log(s);  // replace with your solution
    rl.close();
});`,

            java:
`import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.nextLine();

        // TODO: reverse s and print it
        System.out.println(s); // replace with your solution
    }
}`,

            cpp:
`#include <iostream>
#include <string>
#include <algorithm>
using namespace std;

int main() {
    string s;
    getline(cin, s);

    // TODO: reverse s and print it
    cout << s << endl; // replace with your solution
    return 0;
}`,
        },
        testCases: [
            { input: 'hello',   stdin: 'hello',   expected: 'olleh',   hidden: false },
            { input: 'Hannah',  stdin: 'Hannah',  expected: 'hannaH',  hidden: false },
            { input: 'racecar', stdin: 'racecar', expected: 'racecar', hidden: true  },
            { input: 'abcde',   stdin: 'abcde',   expected: 'edcba',   hidden: true  },
        ],
    },

    twoSum: {
        title: 'Two Sum',
        difficulty: 'easy',
        description:
`Given a list of integers and a target number, find two numbers in the list
that add up to the target. Print the 0-based indices of those two numbers,
separated by a space.  You may assume exactly one solution exists.

Input format:
  Line 1: integers separated by spaces (the list)
  Line 2: the target integer

Output format:
  Two indices separated by a space (smaller index first)

Example
  Input:
    2 7 11 15
    9
  Output: 0 1   (because 2 + 7 = 9)`,
        constraints: [
            '2 ≤ length of list ≤ 1000',
            '-10000 ≤ each number ≤ 10000',
            'Exactly one valid answer exists',
        ],
        examples: [
            { input: '2 7 11 15\n9',  output: '0 1',  explanation: 'nums[0]+nums[1] = 2+7 = 9' },
            { input: '3 2 4\n6',      output: '1 2',  explanation: 'nums[1]+nums[2] = 2+4 = 6' },
        ],
        functionSignature: null,
        starterCode: {
            python:
`# Read the list and the target
nums = list(map(int, input().split()))
target = int(input())

# TODO: find two indices that sum to target and print them
# Example: print(i, j)`,

            javascript:
`const lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');
const nums   = lines[0].split(' ').map(Number);
const target = Number(lines[1]);

// TODO: find two indices that sum to target, then:
// console.log(i + ' ' + j);`,

            java:
`import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String[] parts = sc.nextLine().split(" ");
        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
        int target = sc.nextInt();

        // TODO: find two indices that sum to target and print them
        // System.out.println(i + " " + j);
    }
}`,

            cpp:
`#include <iostream>
#include <sstream>
#include <vector>
using namespace std;

int main() {
    string line; getline(cin, line);
    istringstream iss(line);
    vector<int> nums; int x;
    while (iss >> x) nums.push_back(x);

    int target; cin >> target;

    // TODO: find two indices that sum to target and print them
    // cout << i << " " << j << endl;
    return 0;
}`,
        },
        testCases: [
            { input: '2 7 11 15\n9', stdin: '2 7 11 15\n9', expected: '0 1', hidden: false },
            { input: '3 2 4\n6',     stdin: '3 2 4\n6',     expected: '1 2', hidden: false },
            { input: '3 3\n6',       stdin: '3 3\n6',       expected: '0 1', hidden: true  },
            { input: '2 5 5 11\n10', stdin: '2 5 5 11\n10', expected: '1 2', hidden: true  },
        ],
    },

    fibonacci: {
        title: 'Fibonacci Number',
        difficulty: 'easy',
        description:
`Read a non-negative integer n and print the nth Fibonacci number.
F(0) = 0,  F(1) = 1,  F(n) = F(n-1) + F(n-2)

Input format:  one integer n
Output format: one integer — F(n)

Example
  Input:  5
  Output: 5     (0 1 1 2 3 5)`,
        constraints: ['0 ≤ n ≤ 30'],
        examples: [
            { input: '5',  output: '5',  explanation: 'F(5) = 5' },
            { input: '10', output: '55', explanation: 'F(10) = 55' },
        ],
        functionSignature: null,
        starterCode: {
            python:
`n = int(input())

# TODO: calculate F(n) and print it
# Hint: start with a = 0, b = 1 and loop n times`,

            javascript:
`const n = parseInt(require('fs').readFileSync('/dev/stdin','utf8').trim());

// TODO: calculate F(n) and print it
// console.log(result);`,

            java:
`import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        int n = new Scanner(System.in).nextInt();

        // TODO: calculate F(n) and print it
        // System.out.println(result);
    }
}`,

            cpp:
`#include <iostream>
using namespace std;

int main() {
    int n; cin >> n;

    // TODO: calculate F(n) and print it
    // cout << result << endl;
    return 0;
}`,
        },
        testCases: [
            { input: '5',  stdin: '5',  expected: '5',  hidden: false },
            { input: '10', stdin: '10', expected: '55', hidden: false },
            { input: '0',  stdin: '0',  expected: '0',  hidden: true  },
            { input: '1',  stdin: '1',  expected: '1',  hidden: true  },
        ],
    },

    isPalindrome: {
        title: 'Check Palindrome',
        difficulty: 'easy',
        description:
`Read a string and print "true" if it is a palindrome, or "false" if not.
A palindrome reads the same forwards and backwards (ignore case and spaces).

Input format:  one line of text
Output format: true  or  false

Example
  Input:  racecar
  Output: true

  Input:  hello
  Output: false`,
        constraints: ['1 ≤ length ≤ 10000', 'String contains printable ASCII'],
        examples: [
            { input: 'racecar',                    output: 'true'  },
            { input: 'hello',                      output: 'false' },
            { input: 'A man a plan a canal Panama', output: 'true', explanation: 'ignore spaces and case' },
        ],
        functionSignature: null,
        starterCode: {
            python:
`s = input()

# TODO: check if s is a palindrome and print true or false
# Hint: you might want to clean the string first (lowercase, remove spaces)`,

            javascript:
`const s = require('fs').readFileSync('/dev/stdin','utf8').trim();

// TODO: check if s is a palindrome
// console.log(true or false);`,

            java:
`import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        String s = new Scanner(System.in).nextLine();

        // TODO: check if s is a palindrome and print true or false
        // System.out.println(true or false);
    }
}`,

            cpp:
`#include <iostream>
#include <string>
using namespace std;

int main() {
    string s; getline(cin, s);

    // TODO: check if s is a palindrome and print true or false
    return 0;
}`,
        },
        testCases: [
            { input: 'racecar', stdin: 'racecar', expected: 'true',  hidden: false },
            { input: 'hello',   stdin: 'hello',   expected: 'false', hidden: false },
            { input: 'A man a plan a canal Panama', stdin: 'A man a plan a canal Panama', expected: 'true', hidden: true },
            { input: 'race a car', stdin: 'race a car', expected: 'false', hidden: true },
        ],
    },

    factorial: {
        title: 'Factorial',
        difficulty: 'easy',
        description:
`Read a non-negative integer n and print n! (n factorial).
n! = 1 × 2 × 3 × … × n    (special case: 0! = 1)

Input format:  one integer n
Output format: one integer — n!

Example
  Input:  5
  Output: 120`,
        constraints: ['0 ≤ n ≤ 12'],
        examples: [
            { input: '5', output: '120', explanation: '5×4×3×2×1 = 120' },
            { input: '0', output: '1',   explanation: '0! = 1 by definition' },
        ],
        functionSignature: null,
        starterCode: {
            python:
`n = int(input())

# TODO: compute n! and print it
# Hint: start result = 1 and multiply by each number from 1 to n`,

            javascript:
`const n = parseInt(require('fs').readFileSync('/dev/stdin','utf8').trim());

// TODO: compute n! and print it`,

            java:
`import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        int n = new Scanner(System.in).nextInt();

        // TODO: compute n! and print it
    }
}`,

            cpp:
`#include <iostream>
using namespace std;
int main() {
    int n; cin >> n;
    // TODO: compute n! and print it
    return 0;
}`,
        },
        testCases: [
            { input: '5', stdin: '5', expected: '120',  hidden: false },
            { input: '0', stdin: '0', expected: '1',    hidden: false },
            { input: '7', stdin: '7', expected: '5040', hidden: true  },
            { input: '1', stdin: '1', expected: '1',    hidden: true  },
        ],
    },

    maxSubarray: {
        title: 'Maximum Subarray Sum',
        difficulty: 'medium',
        description:
`Given a list of integers (which may include negatives), find the largest
possible sum of any contiguous subarray.

Input format:  integers separated by spaces on one line
Output format: one integer — the maximum subarray sum

Example
  Input:  -2 1 -3 4 -1 2 1 -5 4
  Output: 6     (subarray [4, -1, 2, 1])`,
        constraints: ['1 ≤ length ≤ 100000', '-10000 ≤ each number ≤ 10000'],
        examples: [
            { input: '-2 1 -3 4 -1 2 1 -5 4', output: '6',  explanation: '[4,-1,2,1] sums to 6' },
            { input: '5 4 -1 7 8',             output: '23', explanation: 'the entire array sums to 23' },
        ],
        functionSignature: null,
        starterCode: {
            python:
`nums = list(map(int, input().split()))

# TODO: find the maximum subarray sum and print it
# Hint: Kadane's algorithm — keep a running sum, reset when it goes negative`,

            javascript:
`const nums = require('fs').readFileSync('/dev/stdin','utf8').trim().split(' ').map(Number);

// TODO: find the maximum subarray sum and print it`,

            java:
`import java.util.*;

public class Solution {
    public static void main(String[] args) {
        String[] parts = new Scanner(System.in).nextLine().split(" ");
        int[] nums = Arrays.stream(parts).mapToInt(Integer::parseInt).toArray();

        // TODO: find the maximum subarray sum and print it
    }
}`,

            cpp:
`#include <iostream>
#include <sstream>
#include <vector>
using namespace std;

int main() {
    string line; getline(cin, line);
    istringstream iss(line); int x;
    vector<int> nums;
    while (iss >> x) nums.push_back(x);

    // TODO: find the maximum subarray sum and print it
    return 0;
}`,
        },
        testCases: [
            { input: '-2 1 -3 4 -1 2 1 -5 4', stdin: '-2 1 -3 4 -1 2 1 -5 4', expected: '6',  hidden: false },
            { input: '1',                      stdin: '1',                      expected: '1',  hidden: false },
            { input: '5 4 -1 7 8',             stdin: '5 4 -1 7 8',             expected: '23', hidden: true  },
            { input: '-1 -2 -3',               stdin: '-1 -2 -3',               expected: '-1', hidden: true  },
        ],
    },

    countVowels: {
        title: 'Count Vowels',
        difficulty: 'easy',
        description:
`Read a line of text and print how many vowels (a e i o u) it contains.
Count both uppercase and lowercase vowels.

Input format:  one line of text
Output format: one integer — the vowel count

Example
  Input:  hello
  Output: 2     (e, o)`,
        constraints: ['1 ≤ length ≤ 100000'],
        examples: [
            { input: 'hello',     output: '2', explanation: 'e and o' },
            { input: 'Interview', output: '4', explanation: 'I, e, i, e' },
        ],
        functionSignature: null,
        starterCode: {
            python:
`s = input()

# TODO: count vowels in s and print the count
# Hint: check each character against 'aeiouAEIOU'`,

            javascript:
`const s = require('fs').readFileSync('/dev/stdin','utf8').trim();

// TODO: count vowels in s and print the count`,

            java:
`import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        String s = new Scanner(System.in).nextLine();

        // TODO: count vowels and print the count
    }
}`,

            cpp:
`#include <iostream>
#include <string>
using namespace std;
int main() {
    string s; getline(cin, s);
    // TODO: count vowels and print the count
    return 0;
}`,
        },
        testCases: [
            { input: 'hello',     stdin: 'hello',     expected: '2', hidden: false },
            { input: 'Interview', stdin: 'Interview', expected: '4', hidden: false },
            { input: 'rhythm',    stdin: 'rhythm',    expected: '0', hidden: true  },
            { input: 'aeiou',     stdin: 'aeiou',     expected: '5', hidden: true  },
        ],
    },

    binarySearch: {
        title: 'Binary Search',
        difficulty: 'easy',
        description:
`You are given a sorted list of unique integers and a target.
Print the 0-based index of the target in the list.
If the target is not found, print -1.
Your algorithm must run in O(log n) time — use binary search, not a loop scan.

Input format:
  Line 1: integers in ascending order, space-separated
  Line 2: the target integer

Output format:
  One integer — the index, or -1

Example
  Input:
    -1 0 3 5 9 12
    9
  Output: 4`,
        constraints: ['1 ≤ length ≤ 10000', 'All integers are unique', 'List is sorted ascending'],
        examples: [
            { input: '-1 0 3 5 9 12\n9',  output: '4',  explanation: '9 is at index 4' },
            { input: '-1 0 3 5 9 12\n2',  output: '-1', explanation: '2 is not in the list' },
        ],
        functionSignature: null,
        starterCode: {
            python:
`nums   = list(map(int, input().split()))
target = int(input())

# TODO: binary search — find index of target (or -1)
# Hint: use left=0, right=len(nums)-1, mid=(left+right)//2`,

            javascript:
`const lines  = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');
const nums   = lines[0].split(' ').map(Number);
const target = Number(lines[1]);

// TODO: binary search — print index or -1`,

            java:
`import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int[] nums = Arrays.stream(sc.nextLine().split(" ")).mapToInt(Integer::parseInt).toArray();
        int target = sc.nextInt();

        // TODO: binary search — print index or -1
    }
}`,

            cpp:
`#include <iostream>
#include <sstream>
#include <vector>
using namespace std;
int main() {
    string line; getline(cin, line);
    istringstream iss(line); int x;
    vector<int> nums;
    while (iss >> x) nums.push_back(x);
    int target; cin >> target;

    // TODO: binary search — print index or -1
    return 0;
}`,
        },
        testCases: [
            { input: '-1 0 3 5 9 12\n9',  stdin: '-1 0 3 5 9 12\n9',  expected: '4',  hidden: false },
            { input: '-1 0 3 5 9 12\n2',  stdin: '-1 0 3 5 9 12\n2',  expected: '-1', hidden: false },
            { input: '1\n1',              stdin: '1\n1',              expected: '0',  hidden: true  },
            { input: '1 3 5 7 9\n6',      stdin: '1 3 5 7 9\n6',      expected: '-1', hidden: true  },
        ],
    },

    fizzBuzz: {
        title: 'FizzBuzz',
        difficulty: 'easy',
        description:
`Read a number n. Print numbers from 1 to n, one per line.
But replace multiples of 3 with "Fizz", multiples of 5 with "Buzz",
and multiples of both 3 and 5 with "FizzBuzz".

Input format:  one integer n
Output format: n lines

Example
  Input:  5
  Output:
    1
    2
    Fizz
    4
    Buzz`,
        constraints: ['1 ≤ n ≤ 10000'],
        examples: [
            { input: '5',  output: '1\n2\nFizz\n4\nBuzz' },
            { input: '15', output: '...FizzBuzz on the last line' },
        ],
        functionSignature: null,
        starterCode: {
            python:
`n = int(input())

# TODO: loop from 1 to n and print Fizz/Buzz/FizzBuzz or the number`,

            javascript:
`const n = parseInt(require('fs').readFileSync('/dev/stdin','utf8').trim());

// TODO: loop from 1 to n and print Fizz/Buzz/FizzBuzz or the number`,

            java:
`import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        int n = new Scanner(System.in).nextInt();

        // TODO: loop from 1 to n and print Fizz/Buzz/FizzBuzz or the number
    }
}`,

            cpp:
`#include <iostream>
using namespace std;
int main() {
    int n; cin >> n;
    // TODO: loop from 1 to n and print Fizz/Buzz/FizzBuzz or the number
    return 0;
}`,
        },
        testCases: [
            { input: '3',  stdin: '3',  expected: '1\n2\nFizz', hidden: false },
            { input: '5',  stdin: '5',  expected: '1\n2\nFizz\n4\nBuzz', hidden: false },
            { input: '15', stdin: '15', expected: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz', hidden: true },
            { input: '1',  stdin: '1',  expected: '1', hidden: true },
        ],
    },

    missingNumber: {
        title: 'Find the Missing Number',
        difficulty: 'easy',
        description:
`You are given n-1 distinct numbers from the range 0 to n (so exactly one
number in that range is missing).  Find and print the missing number.

Input format:  integers separated by spaces (any order)
Output format: one integer — the missing number

Example
  Input:  3 0 1
  Output: 2     (range is 0-3, and 2 is missing)`,
        constraints: ['1 ≤ n ≤ 10000', 'All given numbers are distinct'],
        examples: [
            { input: '3 0 1', output: '2', explanation: 'range 0-3, 2 is missing' },
            { input: '0 1',   output: '2', explanation: 'range 0-2, 2 is missing' },
        ],
        functionSignature: null,
        starterCode: {
            python:
`nums = list(map(int, input().split()))

# TODO: find the missing number and print it
# Hint: sum of 0..n is n*(n+1)//2`,

            javascript:
`const nums = require('fs').readFileSync('/dev/stdin','utf8').trim().split(' ').map(Number);

// TODO: find the missing number and print it`,

            java:
`import java.util.*;

public class Solution {
    public static void main(String[] args) {
        int[] nums = Arrays.stream(new Scanner(System.in).nextLine().split(" "))
                           .mapToInt(Integer::parseInt).toArray();

        // TODO: find the missing number and print it
    }
}`,

            cpp:
`#include <iostream>
#include <sstream>
#include <vector>
using namespace std;
int main() {
    string line; getline(cin, line);
    istringstream iss(line); int x;
    vector<int> nums;
    while (iss >> x) nums.push_back(x);
    // TODO: find the missing number and print it
    return 0;
}`,
        },
        testCases: [
            { input: '3 0 1',               stdin: '3 0 1',               expected: '2', hidden: false },
            { input: '0 1',                 stdin: '0 1',                 expected: '2', hidden: false },
            { input: '9 6 4 2 3 5 7 0 1',   stdin: '9 6 4 2 3 5 7 0 1',   expected: '8', hidden: true  },
            { input: '0',                   stdin: '0',                   expected: '1', hidden: true  },
        ],
    },

    containsDuplicate: {
        title: 'Contains Duplicate',
        difficulty: 'easy',
        description:
`Read a list of integers. Print "true" if any number appears more than once,
or "false" if all numbers are unique.

Input format:  integers separated by spaces on one line
Output format: true  or  false

Example
  Input:  1 2 3 1
  Output: true   (1 appears twice)`,
        constraints: ['1 ≤ length ≤ 100000'],
        examples: [
            { input: '1 2 3 1', output: 'true',  explanation: '1 appears twice' },
            { input: '1 2 3 4', output: 'false', explanation: 'all unique' },
        ],
        functionSignature: null,
        starterCode: {
            python:
`nums = list(map(int, input().split()))

# TODO: check if any number is duplicated and print true or false
# Hint: a set only keeps unique values`,

            javascript:
`const nums = require('fs').readFileSync('/dev/stdin','utf8').trim().split(' ').map(Number);

// TODO: check for duplicates and print true or false`,

            java:
`import java.util.*;

public class Solution {
    public static void main(String[] args) {
        String[] parts = new Scanner(System.in).nextLine().split(" ");
        int[] nums = Arrays.stream(parts).mapToInt(Integer::parseInt).toArray();

        // TODO: check for duplicates and print true or false
    }
}`,

            cpp:
`#include <iostream>
#include <sstream>
#include <vector>
#include <set>
using namespace std;
int main() {
    string line; getline(cin, line);
    istringstream iss(line); int x;
    vector<int> nums;
    while (iss >> x) nums.push_back(x);
    // TODO: check for duplicates and print true or false
    return 0;
}`,
        },
        testCases: [
            { input: '1 2 3 1',           stdin: '1 2 3 1',           expected: 'true',  hidden: false },
            { input: '1 2 3 4',           stdin: '1 2 3 4',           expected: 'false', hidden: false },
            { input: '1 1 1 3 3 4 3 2 4', stdin: '1 1 1 3 3 4 3 2 4', expected: 'true',  hidden: true  },
            { input: '1',                 stdin: '1',                 expected: 'false', hidden: true  },
        ],
    },

    moveZeroes: {
        title: 'Move Zeroes to End',
        difficulty: 'easy',
        description:
`Read a list of integers. Move all 0s to the end while keeping the relative
order of the non-zero numbers.  Print the result, space-separated.

Input format:  integers separated by spaces
Output format: the rearranged integers, space-separated

Example
  Input:  0 1 0 3 12
  Output: 1 3 12 0 0`,
        constraints: ['1 ≤ length ≤ 10000'],
        examples: [
            { input: '0 1 0 3 12', output: '1 3 12 0 0' },
            { input: '0',          output: '0' },
        ],
        functionSignature: null,
        starterCode: {
            python:
`nums = list(map(int, input().split()))

# TODO: move all 0s to the end (keep non-zero order), then print
# Hint: collect non-zeros first, then append the zeros`,

            javascript:
`const nums = require('fs').readFileSync('/dev/stdin','utf8').trim().split(' ').map(Number);

// TODO: move zeroes to end and print result`,

            java:
`import java.util.*;

public class Solution {
    public static void main(String[] args) {
        String[] parts = new Scanner(System.in).nextLine().split(" ");
        int[] nums = Arrays.stream(parts).mapToInt(Integer::parseInt).toArray();

        // TODO: move zeroes to end and print space-separated
    }
}`,

            cpp:
`#include <iostream>
#include <sstream>
#include <vector>
using namespace std;
int main() {
    string line; getline(cin, line);
    istringstream iss(line); int x;
    vector<int> nums;
    while (iss >> x) nums.push_back(x);
    // TODO: move zeroes to end and print space-separated
    return 0;
}`,
        },
        testCases: [
            { input: '0 1 0 3 12', stdin: '0 1 0 3 12', expected: '1 3 12 0 0', hidden: false },
            { input: '0',          stdin: '0',           expected: '0',          hidden: false },
            { input: '1 0 0 2 3',  stdin: '1 0 0 2 3',  expected: '1 2 3 0 0',  hidden: true  },
            { input: '1 2 3',      stdin: '1 2 3',       expected: '1 2 3',      hidden: true  },
        ],
    },

    maxProfit: {
        title: 'Best Time to Buy and Sell Stock',
        difficulty: 'easy',
        description:
`You are given a list of stock prices for n days (prices[i] is the price on day i).
You can buy on one day and sell on a later day.
Print the maximum profit possible.  If no profit is possible, print 0.

Input format:  prices separated by spaces on one line
Output format: one integer — the maximum profit

Example
  Input:  7 1 5 3 6 4
  Output: 5    (buy at 1 on day 1, sell at 6 on day 4)`,
        constraints: ['1 ≤ n ≤ 100000', '0 ≤ price ≤ 10000'],
        examples: [
            { input: '7 1 5 3 6 4', output: '5', explanation: 'buy at 1, sell at 6' },
            { input: '7 6 4 3 1',   output: '0', explanation: 'prices only fall — no profit' },
        ],
        functionSignature: null,
        starterCode: {
            python:
`prices = list(map(int, input().split()))

# TODO: find the max profit and print it
# Hint: track the minimum price seen so far as you scan left to right`,

            javascript:
`const prices = require('fs').readFileSync('/dev/stdin','utf8').trim().split(' ').map(Number);

// TODO: find the max profit and print it`,

            java:
`import java.util.*;

public class Solution {
    public static void main(String[] args) {
        int[] prices = Arrays.stream(new Scanner(System.in).nextLine().split(" "))
                             .mapToInt(Integer::parseInt).toArray();

        // TODO: find the max profit and print it
    }
}`,

            cpp:
`#include <iostream>
#include <sstream>
#include <vector>
using namespace std;
int main() {
    string line; getline(cin, line);
    istringstream iss(line); int x;
    vector<int> prices;
    while (iss >> x) prices.push_back(x);
    // TODO: find the max profit and print it
    return 0;
}`,
        },
        testCases: [
            { input: '7 1 5 3 6 4', stdin: '7 1 5 3 6 4', expected: '5', hidden: false },
            { input: '7 6 4 3 1',   stdin: '7 6 4 3 1',   expected: '0', hidden: false },
            { input: '1 2',         stdin: '1 2',          expected: '1', hidden: true  },
            { input: '2 4 1',       stdin: '2 4 1',        expected: '2', hidden: true  },
        ],
    },

    singleNumber: {
        title: 'Find the Unique Number',
        difficulty: 'easy',
        description:
`Every number in the list appears exactly twice, except for one.
Find and print that unique number.
(Bonus challenge: can you do it without extra memory?)

Input format:  integers separated by spaces
Output format: one integer — the unique number

Example
  Input:  4 1 2 1 2
  Output: 4`,
        constraints: ['1 ≤ length ≤ 60000 (always odd)', 'All numbers except one appear exactly twice'],
        examples: [
            { input: '2 2 1',     output: '1' },
            { input: '4 1 2 1 2', output: '4' },
        ],
        functionSignature: null,
        starterCode: {
            python:
`nums = list(map(int, input().split()))

# TODO: find the number that appears only once and print it
# Hint 1 (easy): use a dictionary to count occurrences
# Hint 2 (clever): XOR — a ^ a = 0, so XOR all numbers together`,

            javascript:
`const nums = require('fs').readFileSync('/dev/stdin','utf8').trim().split(' ').map(Number);

// TODO: find the unique number and print it`,

            java:
`import java.util.*;

public class Solution {
    public static void main(String[] args) {
        int[] nums = Arrays.stream(new Scanner(System.in).nextLine().split(" "))
                           .mapToInt(Integer::parseInt).toArray();

        // TODO: find the unique number and print it
    }
}`,

            cpp:
`#include <iostream>
#include <sstream>
#include <vector>
using namespace std;
int main() {
    string line; getline(cin, line);
    istringstream iss(line); int x;
    vector<int> nums;
    while (iss >> x) nums.push_back(x);
    // TODO: find the unique number and print it
    return 0;
}`,
        },
        testCases: [
            { input: '2 2 1',     stdin: '2 2 1',     expected: '1', hidden: false },
            { input: '4 1 2 1 2', stdin: '4 1 2 1 2', expected: '4', hidden: false },
            { input: '1',         stdin: '1',          expected: '1', hidden: true  },
            { input: '0 0 7 4 4', stdin: '0 0 7 4 4', expected: '7', hidden: true  },
        ],
    },

    climbingStairs: {
        title: 'Climbing Stairs',
        difficulty: 'easy',
        description:
`You are climbing a staircase with n steps.
Each time you can climb 1 or 2 steps.
Print the number of distinct ways to reach the top.

Input format:  one integer n
Output format: one integer — the number of ways

Example
  Input:  3
  Output: 3
  (ways: 1+1+1,  1+2,  2+1)`,
        constraints: ['1 ≤ n ≤ 45'],
        examples: [
            { input: '2', output: '2', explanation: '(1+1) or (2)' },
            { input: '3', output: '3', explanation: '(1+1+1), (1+2), (2+1)' },
        ],
        functionSignature: null,
        starterCode: {
            python:
`n = int(input())

# TODO: find number of ways to climb n stairs and print it
# Hint: this is very similar to Fibonacci numbers`,

            javascript:
`const n = parseInt(require('fs').readFileSync('/dev/stdin','utf8').trim());

// TODO: find number of ways to climb n stairs and print it`,

            java:
`import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        int n = new Scanner(System.in).nextInt();

        // TODO: find number of ways to climb n stairs and print it
    }
}`,

            cpp:
`#include <iostream>
using namespace std;
int main() {
    int n; cin >> n;
    // TODO: find number of ways to climb n stairs and print it
    return 0;
}`,
        },
        testCases: [
            { input: '2',  stdin: '2',  expected: '2',  hidden: false },
            { input: '3',  stdin: '3',  expected: '3',  hidden: false },
            { input: '5',  stdin: '5',  expected: '8',  hidden: true  },
            { input: '10', stdin: '10', expected: '89', hidden: true  },
        ],
    },

    sortColors: {
        title: 'Sort 0s, 1s and 2s',
        difficulty: 'medium',
        description:
`You have a list of numbers that are only 0, 1, or 2.
Sort them so that all 0s come first, then 1s, then 2s.
Print the sorted list, space-separated.
(Try to do it in a single pass without using a sorting function.)

Input format:  integers (0, 1, or 2) separated by spaces
Output format: the sorted integers, space-separated

Example
  Input:  2 0 2 1 1 0
  Output: 0 0 1 1 2 2`,
        constraints: ['1 ≤ length ≤ 300', 'Each number is 0, 1, or 2'],
        examples: [
            { input: '2 0 2 1 1 0', output: '0 0 1 1 2 2' },
            { input: '2 0 1',       output: '0 1 2' },
        ],
        functionSignature: null,
        starterCode: {
            python:
`nums = list(map(int, input().split()))

# TODO: sort so 0s come first, then 1s, then 2s, and print
# Hint: count how many 0s, 1s, and 2s there are`,

            javascript:
`const nums = require('fs').readFileSync('/dev/stdin','utf8').trim().split(' ').map(Number);

// TODO: sort 0/1/2 and print`,

            java:
`import java.util.*;

public class Solution {
    public static void main(String[] args) {
        int[] nums = Arrays.stream(new Scanner(System.in).nextLine().split(" "))
                           .mapToInt(Integer::parseInt).toArray();

        // TODO: sort 0/1/2 and print space-separated
    }
}`,

            cpp:
`#include <iostream>
#include <sstream>
#include <vector>
using namespace std;
int main() {
    string line; getline(cin, line);
    istringstream iss(line); int x;
    vector<int> nums;
    while (iss >> x) nums.push_back(x);
    // TODO: sort 0/1/2 and print space-separated
    return 0;
}`,
        },
        testCases: [
            { input: '2 0 2 1 1 0', stdin: '2 0 2 1 1 0', expected: '0 0 1 1 2 2', hidden: false },
            { input: '2 0 1',       stdin: '2 0 1',       expected: '0 1 2',       hidden: false },
            { input: '0',           stdin: '0',            expected: '0',           hidden: true  },
            { input: '1 0 0 2 1',   stdin: '1 0 0 2 1',   expected: '0 0 1 1 2',   hidden: true  },
        ],
    },

    longestCommonPrefix: {
        title: 'Longest Common Prefix',
        difficulty: 'easy',
        description:
`Read several words (one per line, terminated by an empty line or EOF).
Print the longest string that is a prefix of every word.
If there is no common prefix, print an empty line.

Input format:  words on separate lines (read until empty line or end of input)
Output format: the longest common prefix (may be empty)

Example
  Input:
    flower
    flow
    flight
  Output: fl`,
        constraints: ['1 ≤ number of words ≤ 200', '0 ≤ word length ≤ 200'],
        examples: [
            { input: 'flower\nflow\nflight', output: 'fl',  explanation: '"fl" is common to all three' },
            { input: 'dog\nracecar\ncar',    output: '',    explanation: 'no common prefix' },
        ],
        functionSignature: null,
        starterCode: {
            python:
`import sys
words = [line.rstrip('\\n') for line in sys.stdin if line.strip()]

# TODO: find the longest common prefix of all words and print it
# Hint: start with words[0] as your prefix, then shorten it until it fits all words`,

            javascript:
`const words = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');

// TODO: find the longest common prefix and print it (empty string if none)`,

            java:
`import java.util.*;

public class Solution {
    public static void main(String[] args) {
        List<String> words = new ArrayList<>();
        Scanner sc = new Scanner(System.in);
        while (sc.hasNextLine()) {
            String line = sc.nextLine();
            if (!line.isEmpty()) words.add(line);
        }

        // TODO: find the longest common prefix and print it
    }
}`,

            cpp:
`#include <iostream>
#include <vector>
#include <string>
using namespace std;
int main() {
    vector<string> words;
    string line;
    while (getline(cin, line)) if (!line.empty()) words.push_back(line);
    // TODO: find the longest common prefix and print it
    return 0;
}`,
        },
        testCases: [
            { input: 'flower\nflow\nflight',          stdin: 'flower\nflow\nflight',          expected: 'fl',  hidden: false },
            { input: 'dog\nracecar\ncar',             stdin: 'dog\nracecar\ncar',             expected: '',    hidden: false },
            { input: 'interview\ninter\nint',         stdin: 'interview\ninter\nint',         expected: 'int', hidden: true  },
            { input: 'a',                             stdin: 'a',                             expected: 'a',   hidden: true  },
        ],
    },

};

// ─── Problem keys split by difficulty ─────────────────────────────────────────
const EASY_KEYS   = [
    'reverseString','fibonacci','isPalindrome','factorial',
    'countVowels','binarySearch','fizzBuzz','missingNumber',
    'containsDuplicate','moveZeroes','singleNumber',
    'climbingStairs','maxProfit','longestCommonPrefix',
];
const MEDIUM_KEYS = ['twoSum','maxSubarray','sortColors'];
const ALL_KEYS    = [...EASY_KEYS, ...MEDIUM_KEYS];

const _recentlyUsed = new Set();

function pickProblemsForSession(expLevel = 'mid') {
    let pool1, pool2;
    if (expLevel === 'entry') {
        pool1 = EASY_KEYS; pool2 = EASY_KEYS;
    } else if (expLevel === 'mid') {
        pool1 = EASY_KEYS; pool2 = ALL_KEYS;
    } else {
        pool1 = ALL_KEYS; pool2 = MEDIUM_KEYS;
    }

    const pick = (pool, exclude = []) => {
        const excludeSet = new Set([..._recentlyUsed, ...exclude]);
        const avail = pool.filter(k => !excludeSet.has(k));
        const src   = avail.length >= 1 ? avail : pool.filter(k => !new Set(exclude).has(k));
        return src[Math.floor(Math.random() * src.length)];
    };

    const key1 = pick(pool1);
    _recentlyUsed.add(key1);
    const key2 = pick(pool2, [key1]);
    _recentlyUsed.add(key2);

    if (_recentlyUsed.size > Math.floor(ALL_KEYS.length * 0.5)) _recentlyUsed.clear();

    return [
        { key: key1, ...PROBLEM_BANK[key1] },
        { key: key2, ...PROBLEM_BANK[key2] },
    ];
}

// ─── AI question generation ────────────────────────────────────────────────────
async function parseResumeAndGenerateQuestions({ resumeText, role, expLevel }) {
    const [codingQ1, codingQ2] = pickProblemsForSession(expLevel || 'mid');

    const prompt = `You are an interview coach. Generate a structured 3-section interview.

Resume:
"""
${resumeText.slice(0, 3500)}
"""
Target role: ${role}
Experience level: ${expLevel || 'mid'}

REQUIREMENTS:
- Section 1: EXACTLY 8 MCQ questions (section:1, category:"mcq") — test conceptual knowledge relevant to the role
- Section 2: EXACTLY 2 coding questions — ALREADY PROVIDED BELOW, copy them verbatim as JSON
- Section 3: EXACTLY 6 open questions (section:3) — 4 technical + 2 behavioral

Total: 16 questions. IDs 1-16.

CODING QUESTIONS (section 2) — copy these EXACTLY into your JSON output, do NOT modify them:
Q9:  id=9,  section=2, category="coding", title="${codingQ1.title}", difficulty="${codingQ1.difficulty}", text="${codingQ1.description.replace(/"/g,"'")}"
Q10: id=10, section=2, category="coding", title="${codingQ2.title}", difficulty="${codingQ2.difficulty}", text="${codingQ2.description.replace(/"/g,"'")}"

Respond ONLY with valid JSON, no markdown, no backticks:
{
  "skills": ["skill1","skill2"],
  "experience": [{"title":"","company":"","duration":""}],
  "summary": "one sentence",
  "questions": [
    {"id":1,"section":1,"text":"...","type":"technical","category":"mcq","options":["A","B","C","D"],"correctAnswer":0,"explanation":"..."},
    ...8 MCQ questions with IDs 1-8...,
    {"id":9,"section":2,"category":"coding","title":"${codingQ1.title}","difficulty":"${codingQ1.difficulty}","text":"copy the title here"},
    {"id":10,"section":2,"category":"coding","title":"${codingQ2.title}","difficulty":"${codingQ2.difficulty}","text":"copy the title here"},
    ...6 open questions with IDs 11-16 for section 3...
  ]
}

For open questions (IDs 11-16): IDs 11-14 technical (category:"technical"), IDs 15-16 behavioral (category:"behavioral", type:"behavioral").`;

    const raw = await callAI(prompt, 4000);
    let parsed;
    try {
        parsed = JSON.parse(raw.replace(/```json\n?|```\n?/g, '').trim());
    } catch (e) {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
            try { parsed = JSON.parse(match[0]); }
            catch (e2) { throw new Error('AI returned invalid JSON: ' + e2.message); }
        } else {
            throw new Error('AI returned invalid JSON: ' + e.message);
        }
    }

    if (parsed.questions && Array.isArray(parsed.questions)) {
        let codingSlot = 0;
        parsed.questions = parsed.questions.map((q, i) => {
            let section = Number(q.section);
            if (!section || isNaN(section)) {
                if (i < 8)       section = 1;
                else if (i < 10) section = 2;
                else             section = 3;
            }
            let category = q.category;
            if (!category) {
                if (section === 1)                category = 'mcq';
                else if (section === 2)           category = 'coding';
                else if (q.type === 'behavioral') category = 'behavioral';
                else                              category = 'technical';
            }

            // Coding questions — always inject from our bank (AI cannot change them)
            if (section === 2) {
                const src = codingSlot === 0 ? codingQ1 : codingQ2;
                codingSlot++;
                return {
                    id:               q.id ?? (i + 1),
                    section:          2,
                    text:             src.description,
                    type:             'technical',
                    category:         'coding',
                    options:          null,
                    correctAnswer:    null,
                    language:         null,
                    explanation:      null,
                    functionSignature: null,   // ← no function harness
                    starterCode:      src.starterCode,   // ← object with per-language starters
                    testCases:        src.testCases,
                    title:            src.title,
                    difficulty:       src.difficulty,
                    constraints:      src.constraints || [],
                    examples:         src.examples || [],
                };
            }

            return {
                id:            q.id ?? (i + 1),
                section,
                text:          q.text || 'Question unavailable',
                type:          q.type || (category === 'behavioral' ? 'behavioral' : 'technical'),
                category,
                options:       Array.isArray(q.options) ? q.options : null,
                correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : null,
                language:      q.language || null,
                explanation:   q.explanation || null,
                functionSignature: null,
                starterCode:   null,
                testCases:     null,
                title:         null,
                difficulty:    null,
                constraints:   [],
                examples:      [],
            };
        });
    }

    return parsed;
}

async function generateFollowUp({ question, answer, nextQuestion }) {
    const prompt = `You are a warm encouraging interviewer.
Asked: "${question}" | Answer: "${answer}" | Next question: "${nextQuestion}"
Write 1-2 sentences: briefly acknowledge their answer positively then transition to the next question. No markdown.`;
    return callAI(prompt, 300);
}

async function generateClosing(lastAnswer) {
    const prompt = `Interviewer closing after: "${lastAnswer.slice(0, 300)}"
Write 2 warm encouraging sentences thanking them for completing the interview. No markdown.`;
    return callAI(prompt, 200);
}

async function evaluateInterview({ answers, questions = [], role, expLevel }) {
    const { SECTION_MARKS, GRAND_TOTAL_MARKS } = require('../config/constants');

    const buildSectionMap = (answers) => {
        const map = [];
        let passedCoding = false;
        for (let i = 0; i < answers.length; i++) {
            const a = answers[i];
            const isCoding = a.answer && (a.answer.startsWith('[CODE:') || a.answer.startsWith('[STDIN_CODE:'));
            if (isCoding) { passedCoding = true; map.push(2); }
            else if (!passedCoding) map.push(1);
            else map.push(3);
        }
        return map;
    };

    const sectionMap   = buildSectionMap(answers);
    const sectionEarned = { 1: 0, 2: 0, 3: 0 };

    answers.forEach((a, i) => {
        const sec = sectionMap[i] || 3;
        const mpq = SECTION_MARKS[sec]?.perQuestion || 2;
        const isSkipped = !a.answer || a.answer === '[Skipped]';
        if (isSkipped) return;

        if (sec === 1) {
            const q = questions[i];
            if (q && typeof q.correctAnswer === 'number' && Array.isArray(q.options)) {
                const letter = (a.answer || '').charAt(0).toUpperCase();
                const idx    = ['A','B','C','D'].indexOf(letter);
                if (idx !== -1 && idx === q.correctAnswer) sectionEarned[1] += mpq;
            } else {
                sectionEarned[1] += 1;
            }
        } else if (sec === 2) {
            // New tag format: [STDIN_CODE:python:OK] or old [CODE:PYTHON:OK]
            const passedAll = a.answer.includes(':OK]');
            const raw       = a.answer
                .replace(/^\[(?:STDIN_CODE|CODE):\w+(?::OK)?\]\n?/i, '')
                .trim();
            const isStub    = !raw || raw.length < 20;
            if (!isStub && passedAll) {
                sectionEarned[2] += mpq;
            } else if (!isStub) {
                sectionEarned[2] += Math.round(mpq * 0.5);
            }
        } else {
            const len = a.answer.trim().length;
            if      (len >= 200) sectionEarned[3] += mpq;
            else if (len >= 80)  sectionEarned[3] += Math.round(mpq * 0.5);
            else if (len >= 20)  sectionEarned[3] += 1;
        }
    });

    const earnedMarks = sectionEarned[1] + sectionEarned[2] + sectionEarned[3];
    const grandTotal  = GRAND_TOTAL_MARKS;
    const overall     = Math.round((earnedMarks / grandTotal) * 10 * 10) / 10;
    const s1Score     = Math.round((sectionEarned[1] / SECTION_MARKS[1].total) * 10 * 10) / 10;
    const s2Score     = Math.round((sectionEarned[2] / SECTION_MARKS[2].total) * 10 * 10) / 10;
    const s3Score     = Math.round((sectionEarned[3] / SECTION_MARKS[3].total) * 10 * 10) / 10;

    const answeredQA = answers
        .filter(a => a.answer && a.answer !== '[Skipped]')
        .slice(0, 6)
        .map(a => `Q: ${a.question}\nA: ${a.answer.slice(0, 300)}`)
        .join('\n\n');

    let feedback = [], recommendations = [], summary = '', strengths = [], areasToImprove = [];

    if (answeredQA.trim()) {
        const prompt = `You are an interview evaluator for a ${role} position (${expLevel} level).
The candidate scored ${earnedMarks}/${grandTotal} marks (${overall}/10).
Section scores: MCQ ${s1Score}/10, Coding ${s2Score}/10, Video ${s3Score}/10.

Answered questions:
${answeredQA}

Give ONLY qualitative feedback. Do NOT suggest any scores.
Respond ONLY in valid JSON (no markdown):
{
  "feedback": [{"type":"good","text":"..."},{"type":"improve","text":"..."}],
  "recommendations": ["tip 1","tip 2","tip 3"],
  "summary": "2-sentence honest summary mentioning the marks scored",
  "strengths": ["..."],
  "areasToImprove": ["..."]
}`;
        try {
            const rawAI  = await callAI(prompt, 900);
            const clean  = rawAI.replace(/```json\n?|```\n?/g, '').trim();
            const ai     = JSON.parse(clean.match(/\{[\s\S]*\}/)?.[0] || clean);
            feedback        = ai.feedback        || [];
            recommendations = ai.recommendations || [];
            summary         = ai.summary         || '';
            strengths       = ai.strengths        || [];
            areasToImprove  = ai.areasToImprove  || [];
        } catch (_) {}
    }

    if (!summary) {
        const skipped = answers.filter(a => !a.answer || a.answer === '[Skipped]').length;
        summary = `Scored ${earnedMarks}/${grandTotal} marks (${overall}/10). ${skipped} of ${answers.length} questions were skipped.`;
    }

    return {
        overall:   Math.min(overall, 10),
        relevance: Math.min(s1Score, 10),
        clarity:   Math.min(s3Score, 10),
        depth:     Math.min(s2Score, 10),
        sectionScores: { mcq: s1Score, coding: s2Score, video: s3Score },
        earnedMarks,
        grandTotal,
        feedback,
        recommendations,
        summary,
        strengths,
        areasToImprove,
    };
}

module.exports = {
    callClaude: callAI,
    parseResumeAndGenerateQuestions,
    generateFollowUp,
    generateClosing,
    evaluateInterview,
};