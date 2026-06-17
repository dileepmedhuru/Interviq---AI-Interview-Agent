# backend/services/problem_bank.py

PROBLEM_BANK = {
    'reverseString': {
        'title': 'Reverse a String',
        'difficulty': 'easy',
        'description': (
            "You are given a single line of text on standard input.\n"
            "Print the characters of that line in reverse order.\n\n"
            "Input format:  one line of text\n"
            "Output format: the reversed text on one line\n\n"
            "Example\n"
            "  Input:  hello\n"
            "  Output: olleh"
        ),
        'constraints': ['1 <= length of string <= 1000', 'String contains printable ASCII characters'],
        'examples': [
            {'input': 'hello', 'output': 'olleh'},
            {'input': 'Hannah', 'output': 'hannaH'},
        ],
        'functionSignature': None,
        'starterCode': {
            'python': (
                "# Read a line of input\n"
                "s = input()\n\n"
                "# TODO: reverse s and print it\n"
                "print(s)           # replace this line with your solution"
            ),
            'javascript': (
                "// Read a line from stdin\n"
                "const readline = require('readline');\n"
                "const rl = readline.createInterface({ input: process.stdin });\n\n"
                "rl.on('line', (s) => {\n"
                "    // TODO: reverse s and print it\n"
                "    console.log(s);  // replace with your solution\n"
                "    rl.close();\n"
                "});"
            ),
            'java': (
                "import java.util.Scanner;\n\n"
                "public class Solution {\n"
                "    public static void main(String[] args) {\n"
                "        Scanner sc = new Scanner(System.in);\n"
                "        String s = sc.nextLine();\n\n"
                "        // TODO: reverse s and print it\n"
                "        System.out.println(s); // replace with your solution\n"
                "    }\n"
                "}"
            ),
            'cpp': (
                "#include <iostream>\n"
                "#include <string>\n"
                "#include <algorithm>\n"
                "using namespace std;\n\n"
                "int main() {\n"
                "    string s;\n"
                "    getline(cin, s);\n\n"
                "    // TODO: reverse s and print it\n"
                "    cout << s << endl; // replace with your solution\n"
                "    return 0;\n"
                "}"
            ),
        },
        'testCases': [
            {'input': 'hello', 'stdin': 'hello', 'expected': 'olleh', 'hidden': False},
            {'input': 'Hannah', 'stdin': 'Hannah', 'expected': 'hannaH', 'hidden': False},
            {'input': 'racecar', 'stdin': 'racecar', 'expected': 'racecar', 'hidden': True},
            {'input': 'abcde', 'stdin': 'abcde', 'expected': 'edcba', 'hidden': True},
        ],
    },

    'twoSum': {
        'title': 'Two Sum',
        'difficulty': 'easy',
        'description': (
            "Given a list of integers and a target number, find two numbers in the list\n"
            "that add up to the target. Print the 0-based indices of those two numbers,\n"
            "separated by a space.  You may assume exactly one solution exists.\n\n"
            "Input format:\n"
            "  Line 1: integers separated by spaces representing the list (e.g. 2 7 11 15 represents the array [2, 7, 11, 15])\n"
            "  Line 2: the target integer\n\n"
            "Output format:\n"
            "  Two indices separated by a space (smaller index first)\n\n"
            "Example\n"
            "  Input:\n"
            "    2 7 11 15  (list: [2, 7, 11, 15])\n"
            "    9          (target)\n"
            "  Output: 0 1   (because 2 + 7 = 9)"
        ),
        'constraints': [
            '2 <= length of list <= 1000',
            '-10000 <= each number <= 10000',
            'Exactly one valid answer exists',
        ],
        'examples': [
            {'input': '[2, 7, 11, 15]\n9', 'output': '0 1', 'explanation': 'nums[0]+nums[1] = 2+7 = 9'},
            {'input': '[3, 2, 4]\n6', 'output': '1 2', 'explanation': 'nums[1]+nums[2] = 2+4 = 6'},
        ],
        'functionSignature': None,
        'starterCode': {
            'python': (
                "# Read the list and the target\n"
                "nums = list(map(int, input().split()))\n"
                "target = int(input())\n\n"
                "# TODO: find two indices that sum to target and print them\n"
                "# Example: print(i, j)"
            ),
            'javascript': (
                "const lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');\n"
                "const nums   = lines[0].split(' ').map(Number);\n"
                "const target = Number(lines[1]);\n\n"
                "// TODO: find two indices that sum to target, then:\n"
                "// console.log(i + ' ' + j);"
            ),
            'java': (
                "import java.util.*;\n\n"
                "public class Solution {\n"
                "    public static void main(String[] args) {\n"
                "        Scanner sc = new Scanner(System.in);\n"
                "        String[] parts = sc.nextLine().split(\" \");\n"
                "        int[] nums = new int[parts.length];\n"
                "        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);\n"
                "        int target = sc.nextInt();\n\n"
                "        // TODO: find two indices that sum to target and print them\n"
                "        // System.out.println(i + \" \" + j);\n"
                "    }\n"
                "}"
            ),
            'cpp': (
                "#include <iostream>\n"
                "#include <sstream>\n"
                "#include <vector>\n"
                "using namespace std;\n\n"
                "int main() {\n"
                "    string line; getline(cin, line);\n"
                "    istringstream iss(line);\n"
                "    vector<int> nums; int x;\n"
                "    while (iss >> x) nums.push_back(x);\n\n"
                "    int target; cin >> target;\n\n"
                "    // TODO: find two indices that sum to target and print them\n"
                "    // cout << i << \" \" << j << endl;\n"
                "    return 0;\n"
                "}"
            ),
        },
        'testCases': [
            {'input': '[2, 7, 11, 15]\n9', 'stdin': '2 7 11 15\n9', 'expected': '0 1', 'hidden': False},
            {'input': '[3, 2, 4]\n6', 'stdin': '3 2 4\n6', 'expected': '1 2', 'hidden': False},
            {'input': '[3, 3]\n6', 'stdin': '3 3\n6', 'expected': '0 1', 'hidden': True},
            {'input': '[2, 5, 5, 11]\n10', 'stdin': '2 5 5 11\n10', 'expected': '1 2', 'hidden': True},
        ],
    },

    'fibonacci': {
        'title': 'Fibonacci Number',
        'difficulty': 'easy',
        'description': (
            "Read a non-negative integer n and print the nth Fibonacci number.\n"
            "F(0) = 0,  F(1) = 1,  F(n) = F(n-1) + F(n-2)\n\n"
            "Input format:  one integer n\n"
            "Output format: one integer -- F(n)\n\n"
            "Example\n"
            "  Input:  5\n"
            "  Output: 5     (0 1 1 2 3 5)"
        ),
        'constraints': ['0 <= n <= 30'],
        'examples': [
            {'input': '5', 'output': '5', 'explanation': 'F(5) = 5'},
            {'input': '10', 'output': '55', 'explanation': 'F(10) = 55'},
        ],
        'functionSignature': None,
        'starterCode': {
            'python': (
                "n = int(input())\n\n"
                "# TODO: calculate F(n) and print it\n"
                "# Hint: start with a = 0, b = 1 and loop n times"
            ),
            'javascript': (
                "const n = parseInt(require('fs').readFileSync('/dev/stdin','utf8').trim());\n\n"
                "// TODO: calculate F(n) and print it\n"
                "// console.log(result);"
            ),
            'java': (
                "import java.util.Scanner;\n\n"
                "public class Solution {\n"
                "    public static void main(String[] args) {\n"
                "        int n = new Scanner(System.in).nextInt();\n\n"
                "        // TODO: calculate F(n) and print it\n"
                "        // System.out.println(result);\n"
                "    }\n"
                "}"
            ),
            'cpp': (
                "#include <iostream>\n"
                "using namespace std;\n\n"
                "int main() {\n"
                "    int n; cin >> n;\n\n"
                "    // TODO: calculate F(n) and print it\n"
                "    // cout << result << endl;\n"
                "    return 0;\n"
                "}"
            ),
        },
        'testCases': [
            {'input': '5', 'stdin': '5', 'expected': '5', 'hidden': False},
            {'input': '10', 'stdin': '10', 'expected': '55', 'hidden': False},
            {'input': '[0]', 'stdin': '0', 'expected': '0', 'hidden': True},
            {'input': '[1]', 'stdin': '1', 'expected': '1', 'hidden': True},
        ],
    },

    'isPalindrome': {
        'title': 'Check Palindrome',
        'difficulty': 'easy',
        'description': (
            "Read a string and print \"true\" if it is a palindrome, or \"false\" if not.\n"
            "A palindrome reads the same forwards and backwards (ignore case and spaces).\n\n"
            "Input format:  one line of text\n"
            "Output format: true  or  false\n\n"
            "Example\n"
            "  Input:  racecar\n"
            "  Output: true\n\n"
            "  Input:  hello\n"
            "  Output: false"
        ),
        'constraints': ['1 <= length <= 10000', 'String contains printable ASCII'],
        'examples': [
            {'input': 'racecar', 'output': 'true'},
            {'input': 'hello', 'output': 'false'},
            {'input': 'A man a plan a canal Panama', 'output': 'true', 'explanation': 'ignore spaces and case'},
        ],
        'functionSignature': None,
        'starterCode': {
            'python': (
                "s = input()\n\n"
                "# TODO: check if s is a palindrome and print true or false\n"
                "# Hint: you might want to clean the string first (lowercase, remove spaces)"
            ),
            'javascript': (
                "const s = require('fs').readFileSync('/dev/stdin','utf8').trim();\n\n"
                "// TODO: check if s is a palindrome\n"
                "// console.log(true or false);"
            ),
            'java': (
                "import java.util.Scanner;\n\n"
                "public class Solution {\n"
                "    public static void main(String[] args) {\n"
                "        String s = new Scanner(System.in).nextLine();\n\n"
                "        // TODO: check if s is a palindrome and print true or false\n"
                "        // System.out.println(true or false);\n"
                "    }\n"
                "}"
            ),
            'cpp': (
                "#include <iostream>\n"
                "#include <string>\n"
                "using namespace std;\n\n"
                "int main() {\n"
                "    string s; getline(cin, s);\n\n"
                "    // TODO: check if s is a palindrome and print true or false\n"
                "    return 0;\n"
                "}"
            ),
        },
        'testCases': [
            {'input': 'racecar', 'stdin': 'racecar', 'expected': 'true', 'hidden': False},
            {'input': 'hello', 'stdin': 'hello', 'expected': 'false', 'hidden': False},
            {'input': 'A man a plan a canal Panama', 'stdin': 'A man a plan a canal Panama', 'expected': 'true', 'hidden': True},
            {'input': 'race a car', 'stdin': 'race a car', 'expected': 'false', 'hidden': True},
        ],
    },

    'factorial': {
        'title': 'Factorial',
        'difficulty': 'easy',
        'description': (
            "Read a non-negative integer n and print n! (n factorial).\n"
            "n! = 1 * 2 * 3 * ... * n    (special case: 0! = 1)\n\n"
            "Input format:  one integer n\n"
            "Output format: one integer -- n!\n\n"
            "Example\n"
            "  Input:  5\n"
            "  Output: 120"
        ),
        'constraints': ['0 <= n <= 12'],
        'examples': [
            {'input': '5', 'output': '120', 'explanation': '5x4x3x2x1 = 120'},
            {'input': '0', 'output': '1', 'explanation': '0! = 1 by definition'},
        ],
        'functionSignature': None,
        'starterCode': {
            'python': (
                "n = int(input())\n\n"
                "# TODO: compute n! and print it\n"
                "# Hint: start result = 1 and multiply by each number from 1 to n"
            ),
            'javascript': (
                "const n = parseInt(require('fs').readFileSync('/dev/stdin','utf8').trim());\n\n"
                "// TODO: compute n! and print it"
            ),
            'java': (
                "import java.util.Scanner;\n\n"
                "public class Solution {\n"
                "    public static void main(String[] args) {\n"
                "        int n = new Scanner(System.in).nextInt();\n\n"
                "        // TODO: compute n! and print it\n"
                "    }\n"
                "}"
            ),
            'cpp': (
                "#include <iostream>\n"
                "using namespace std;\n"
                "int main() {\n"
                "    int n; cin >> n;\n"
                "    // TODO: compute n! and print it\n"
                "    return 0;\n"
                "}"
            ),
        },
        'testCases': [
            {'input': '5', 'stdin': '5', 'expected': '120', 'hidden': False},
            {'input': '0', 'stdin': '0', 'expected': '1', 'hidden': False},
            {'input': '7', 'stdin': '7', 'expected': '5040', 'hidden': True},
            {'input': '[1]', 'stdin': '1', 'expected': '1', 'hidden': True},
        ],
    },

    'maxSubarray': {
        'title': 'Maximum Subarray Sum',
        'difficulty': 'medium',
        'description': (
            "Given a list of integers (which may include negatives), find the largest\n"
            "possible sum of any contiguous subarray.\n\n"
            "Input format:  integers separated by spaces on one line representing the list (e.g. -2 1 -3 represents the array [-2, 1, -3])\n"
            "Output format: one integer -- the maximum subarray sum\n\n"
            "Example\n"
            "  Input Array:  [-2, 1, -3, 4, -1, 2, 1, -5, 4]\n"
            "  Output: 6     (subarray [4, -1, 2, 1])"
        ),
        'constraints': ['1 <= length <= 100000', '-10000 <= each number <= 10000'],
        'examples': [
            {'input': '[-2, 1, -3, 4, -1, 2, 1, -5, 4]', 'output': '6', 'explanation': '[4,-1,2,1] sums to 6'},
            {'input': '[5, 4, -1, 7, 8]', 'output': '23', 'explanation': 'the entire array sums to 23'},
        ],
        'functionSignature': None,
        'starterCode': {
            'python': (
                "nums = list(map(int, input().split()))\n\n"
                "# TODO: find the maximum subarray sum and print it\n"
                "# Hint: Kadane's algorithm -- keep a running sum, reset when it goes negative"
            ),
            'javascript': (
                "const nums = require('fs').readFileSync('/dev/stdin','utf8').trim().split(' ').map(Number);\n\n"
                "// TODO: find the maximum subarray sum and print it"
            ),
            'java': (
                "import java.util.*;\n\n"
                "public class Solution {\n"
                "    public static void main(String[] args) {\n"
                "        String[] parts = new Scanner(System.in).nextLine().split(\" \");\n"
                "        int[] nums = Arrays.stream(parts).mapToInt(Integer::parseInt).toArray();\n\n"
                "        // TODO: find the maximum subarray sum and print it\n"
                "    }\n"
                "}"
            ),
            'cpp': (
                "#include <iostream>\n"
                "#include <sstream>\n"
                "#include <vector>\n"
                "using namespace std;\n\n"
                "int main() {\n"
                "    string line; getline(cin, line);\n"
                "    istringstream iss(line); int x;\n"
                "    vector<int> nums;\n"
                "    while (iss >> x) nums.push_back(x);\n\n"
                "    // TODO: find the maximum subarray sum and print it\n"
                "    return 0;\n"
                "}"
            ),
        },
        'testCases': [
            {'input': '[-2, 1, -3, 4, -1, 2, 1, -5, 4]', 'stdin': '-2 1 -3 4 -1 2 1 -5 4', 'expected': '6', 'hidden': False},
            {'input': '[1]', 'stdin': '1', 'expected': '1', 'hidden': False},
            {'input': '[5, 4, -1, 7, 8]', 'stdin': '5 4 -1 7 8', 'expected': '23', 'hidden': True},
            {'input': '[-1, -2, -3]', 'stdin': '-1 -2 -3', 'expected': '-1', 'hidden': True},
        ],
    },

    'countVowels': {
        'title': 'Count Vowels',
        'difficulty': 'easy',
        'description': (
            "Read a line of text and print how many vowels (a e i o u) it contains.\n"
            "Count both uppercase and lowercase vowels.\n\n"
            "Input format:  one line of text\n"
            "Output format: one integer -- the vowel count\n\n"
            "Example\n"
            "  Input:  hello\n"
            "  Output: 2     (e, o)"
        ),
        'constraints': ['1 <= length <= 100000'],
        'examples': [
            {'input': 'hello', 'output': '2', 'explanation': 'e and o'},
            {'input': 'Interview', 'output': '4', 'explanation': 'I, e, i, e'},
        ],
        'functionSignature': None,
        'starterCode': {
            'python': (
                "s = input()\n\n"
                "# TODO: count vowels in s and print the count\n"
                "# Hint: check each character against 'aeiouAEIOU'"
            ),
            'javascript': (
                "const s = require('fs').readFileSync('/dev/stdin','utf8').trim();\n\n"
                "// TODO: count vowels in s and print the count"
            ),
            'java': (
                "import java.util.Scanner;\n\n"
                "public class Solution {\n"
                "    public static void main(String[] args) {\n"
                "        String s = new Scanner(System.in).nextLine();\n\n"
                "        // TODO: count vowels and print the count\n"
                "    }\n"
                "}"
            ),
            'cpp': (
                "#include <iostream>\n"
                "#include <string>\n"
                "using namespace std;\n"
                "int main() {\n"
                "    string s; getline(cin, s);\n"
                "    // TODO: count vowels and print the count\n"
                "    return 0;\n"
                "}"
            ),
        },
        'testCases': [
            {'input': 'hello', 'stdin': 'hello', 'expected': '2', 'hidden': False},
            {'input': 'Interview', 'stdin': 'Interview', 'expected': '4', 'hidden': False},
            {'input': 'rhythm', 'stdin': 'rhythm', 'expected': '0', 'hidden': True},
            {'input': 'aeiou', 'stdin': 'aeiou', 'expected': '5', 'hidden': True},
        ],
    },

    'binarySearch': {
        'title': 'Binary Search',
        'difficulty': 'easy',
        'description': (
            "You are given a sorted list of unique integers and a target.\n"
            "Print the 0-based index of the target in the list.\n"
            "If the target is not found, print -1.\n"
            "Your algorithm must run in O(log n) time -- use binary search, not a loop scan.\n\n"
            "Input format:\n"
            "  Line 1: integers in ascending order, space-separated\n"
            "  Line 2: the target integer\n\n"
            "Output format:\n"
            "  One integer -- the index, or -1\n\n"
            "Example\n"
            "  Input:\n"
            "    -1 0 3 5 9 12\n"
            "    9\n"
            "  Output: 4"
        ),
        'constraints': ['1 <= length <= 10000', 'All integers are unique', 'List is sorted ascending'],
        'examples': [
            {'input': '-1 0 3 5 9 12\n9', 'output': '4', 'explanation': '9 is at index 4'},
            {'input': '-1 0 3 5 9 12\n2', 'output': '-1', 'explanation': '2 is not in the list'},
        ],
        'functionSignature': None,
        'starterCode': {
            'python': (
                "nums   = list(map(int, input().split()))\n"
                "target = int(input())\n\n"
                "# TODO: binary search -- find index of target (or -1)\n"
                "# Hint: use left=0, right=len(nums)-1, mid=(left+right)//2"
            ),
            'javascript': (
                "const lines  = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');\n"
                "const nums   = lines[0].split(' ').map(Number);\n"
                "const target = Number(lines[1]);\n\n"
                "// TODO: binary search -- print index or -1"
            ),
            'java': (
                "import java.util.*;\n\n"
                "public class Solution {\n"
                "    public static void main(String[] args) {\n"
                "        Scanner sc = new Scanner(System.in);\n"
                "        int[] nums = Arrays.stream(sc.nextLine().split(\" \")).mapToInt(Integer::parseInt).toArray();\n"
                "        int target = sc.nextInt();\n\n"
                "        // TODO: binary search -- print index or -1\n"
                "    }\n"
                "}"
            ),
            'cpp': (
                "#include <iostream>\n"
                "#include <sstream>\n"
                "#include <vector>\n"
                "using namespace std;\n"
                "int main() {\n"
                "    string line; getline(cin, line);\n"
                "    istringstream iss(line); int x;\n"
                "    vector<int> nums;\n"
                "    while (iss >> x) nums.push_back(x);\n"
                "    int target; cin >> target;\n\n"
                "    // TODO: binary search -- print index or -1\n"
                "    return 0;\n"
                "}"
            ),
        },
        'testCases': [
            {'input': '-1 0 3 5 9 12\n9', 'stdin': '-1 0 3 5 9 12\n9', 'expected': '4', 'hidden': False},
            {'input': '-1 0 3 5 9 12\n2', 'stdin': '-1 0 3 5 9 12\n2', 'expected': '-1', 'hidden': False},
            {'input': '1\n1', 'stdin': '1\n1', 'expected': '0', 'hidden': True},
            {'input': '1 3 5 7 9\n6', 'stdin': '1 3 5 7 9\n6', 'expected': '-1', 'hidden': True},
        ],
    },

    'fizzBuzz': {
        'title': 'FizzBuzz',
        'difficulty': 'easy',
        'description': (
            "Read a number n. Print numbers from 1 to n, one per line.\n"
            "But replace multiples of 3 with \"Fizz\", multiples of 5 with \"Buzz\",\n"
            "and multiples of both 3 and 5 with \"FizzBuzz\".\n\n"
            "Input format:  one integer n\n"
            "Output format: n lines\n\n"
            "Example\n"
            "  Input:  5\n"
            "  Output:\n"
            "    1\n"
            "    2\n"
            "    Fizz\n"
            "    4\n"
            "    Buzz"
        ),
        'constraints': ['1 <= n <= 10000'],
        'examples': [
            {'input': '5', 'output': '1\n2\nFizz\n4\nBuzz'},
            {'input': '15', 'output': '...FizzBuzz on the last line'},
        ],
        'functionSignature': None,
        'starterCode': {
            'python': (
                "n = int(input())\n\n"
                "# TODO: loop from 1 to n and print Fizz/Buzz/FizzBuzz or the number"
            ),
            'javascript': (
                "const n = parseInt(require('fs').readFileSync('/dev/stdin','utf8').trim());\n\n"
                "// TODO: loop from 1 to n and print Fizz/Buzz/FizzBuzz or the number"
            ),
            'java': (
                "import java.util.Scanner;\n\n"
                "public class Solution {\n"
                "    public static void main(String[] args) {\n"
                "        int n = new Scanner(System.in).nextInt();\n\n"
                "        // TODO: loop from 1 to n and print Fizz/Buzz/FizzBuzz or the number\n"
                "    }\n"
                "}"
            ),
            'cpp': (
                "#include <iostream>\n"
                "using namespace std;\n"
                "int main() {\n"
                "    int n; cin >> n;\n"
                "    // TODO: loop from 1 to n and print Fizz/Buzz/FizzBuzz or the number\n"
                "    return 0;\n"
                "}"
            ),
        },
        'testCases': [
            {'input': '3', 'stdin': '3', 'expected': '1\n2\nFizz', 'hidden': False},
            {'input': '5', 'stdin': '5', 'expected': '1\n2\nFizz\n4\nBuzz', 'hidden': False},
            {'input': '15', 'stdin': '15', 'expected': '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz', 'hidden': True},
            {'input': '[1]', 'stdin': '1', 'expected': '1', 'hidden': True},
        ],
    },

    'missingNumber': {
        'title': 'Find the Missing Number',
        'difficulty': 'easy',
        'description': (
            "You are given n-1 distinct numbers from the range 0 to n (so exactly one\n"
            "number in that range is missing).  Find and print the missing number.\n\n"
            "Input format:  integers separated by spaces representing the list (e.g. 3 0 1 represents the array [3, 0, 1])\n"
            "Output format: one integer -- the missing number\n\n"
            "Example\n"
            "  Input:  3 0 1  (array: [3, 0, 1])\n"
            "  Output: 2     (range is 0-3, and 2 is missing)"
        ),
        'constraints': ['1 <= n <= 10000', 'All given numbers are distinct'],
        'examples': [
            {'input': '[3, 0, 1]', 'output': '2', 'explanation': 'range 0-3, 2 is missing'},
            {'input': '[0, 1]', 'output': '2', 'explanation': 'range 0-2, 2 is missing'},
        ],
        'functionSignature': None,
        'starterCode': {
            'python': (
                "nums = list(map(int, input().split()))\n\n"
                "# TODO: find the missing number and print it\n"
                "# Hint: sum of 0..n is n*(n+1)//2"
            ),
            'javascript': (
                "const nums = require('fs').readFileSync('/dev/stdin','utf8').trim().split(' ').map(Number);\n\n"
                "// TODO: find the missing number and print it"
            ),
            'java': (
                "import java.util.*;\n\n"
                "public class Solution {\n"
                "    public static void main(String[] args) {\n"
                "        int[] nums = Arrays.stream(new Scanner(System.in).nextLine().split(\" \"))\n"
                "                           .mapToInt(Integer::parseInt).toArray();\n\n"
                "        // TODO: find the missing number and print it\n"
                "    }\n"
                "}"
            ),
            'cpp': (
                "#include <iostream>\n"
                "#include <sstream>\n"
                "#include <vector>\n"
                "using namespace std;\n"
                "int main() {\n"
                "    string line; getline(cin, line);\n"
                "    istringstream iss(line); int x;\n"
                "    vector<int> nums;\n"
                "    while (iss >> x) nums.push_back(x);\n"
                "    // TODO: find the missing number and print it\n"
                "    return 0;\n"
                "}"
            ),
        },
        'testCases': [
            {'input': '[3, 0, 1]', 'stdin': '3 0 1', 'expected': '2', 'hidden': False},
            {'input': '[0, 1]', 'stdin': '0 1', 'expected': '2', 'hidden': False},
            {'input': '[9, 6, 4, 2, 3, 5, 7, 0, 1]', 'stdin': '9 6 4 2 3 5 7 0 1', 'expected': '8', 'hidden': True},
            {'input': '[0]', 'stdin': '0', 'expected': '1', 'hidden': True},
        ],
    },

    'containsDuplicate': {
        'title': 'Contains Duplicate',
        'difficulty': 'easy',
        'description': (
            "Read a list of integers. Print \"true\" if any number appears more than once,\n"
            "or \"false\" if all numbers are unique.\n\n"
            "Input format:  integers separated by spaces on one line representing the list (e.g. -2 1 -3 represents the array [-2, 1, -3])\n"
            "Output format: true  or  false\n\n"
            "Example\n"
            "  Input Array:  [1, 2, 3, 1]\n"
            "  Output: true   (1 appears twice)"
        ),
        'constraints': ['1 <= length <= 100000'],
        'examples': [
            {'input': '[1, 2, 3, 1]', 'output': 'true', 'explanation': '1 appears twice'},
            {'input': '[1, 2, 3, 4]', 'output': 'false', 'explanation': 'all unique'},
        ],
        'functionSignature': None,
        'starterCode': {
            'python': (
                "nums = list(map(int, input().split()))\n\n"
                "# TODO: check if any number is duplicated and print true or false\n"
                "# Hint: a set only keeps unique values"
            ),
            'javascript': (
                "const nums = require('fs').readFileSync('/dev/stdin','utf8').trim().split(' ').map(Number);\n\n"
                "// TODO: check for duplicates and print true or false"
            ),
            'java': (
                "import java.util.*;\n\n"
                "public class Solution {\n"
                "    public static void main(String[] args) {\n"
                "        String[] parts = new Scanner(System.in).nextLine().split(\" \");\n"
                "        int[] nums = Arrays.stream(parts).mapToInt(Integer::parseInt).toArray();\n\n"
                "        // TODO: check for duplicates and print true or false\n"
                "    }\n"
                "}"
            ),
            'cpp': (
                "#include <iostream>\n"
                "#include <sstream>\n"
                "#include <vector>\n"
                "#include <set>\n"
                "using namespace std;\n"
                "int main() {\n"
                "    string line; getline(cin, line);\n"
                "    istringstream iss(line); int x;\n"
                "    vector<int> nums;\n"
                "    while (iss >> x) nums.push_back(x);\n"
                "    // TODO: check for duplicates and print true or false\n"
                "    return 0;\n"
                "}"
            ),
        },
        'testCases': [
            {'input': '[1, 2, 3, 1]', 'stdin': '1 2 3 1', 'expected': 'true', 'hidden': False},
            {'input': '[1, 2, 3, 4]', 'stdin': '1 2 3 4', 'expected': 'false', 'hidden': False},
            {'input': '[1, 1, 1, 3, 3, 4, 3, 2, 4]', 'stdin': '1 1 1 3 3 4 3 2 4', 'expected': 'true', 'hidden': True},
            {'input': '[1]', 'stdin': '1', 'expected': 'false', 'hidden': True},
        ],
    },

    'moveZeroes': {
        'title': 'Move Zeroes to End',
        'difficulty': 'easy',
        'description': (
            "Read a list of integers. Move all 0s to the end while keeping the relative\n"
            "order of the non-zero numbers.  Print the result, space-separated.\n\n"
            "Input format:  integers separated by spaces representing the list (e.g. 0 1 0 represents the array [0, 1, 0])\n"
            "Output format: the rearranged integers, space-separated\n\n"
            "Example\n"
            "  Input Array:  [0, 1, 0, 3, 12]\n"
            "  Output: 1 3 12 0 0"
        ),
        'constraints': ['1 <= length <= 10000'],
        'examples': [
            {'input': '[0, 1, 0, 3, 12]', 'output': '1 3 12 0 0'},
            {'input': '[0]', 'output': '0'},
        ],
        'functionSignature': None,
        'starterCode': {
            'python': (
                "nums = list(map(int, input().split()))\n\n"
                "# TODO: move all 0s to the end (keep non-zero order), then print\n"
                "# Hint: collect non-zeros first, then append the zeros"
            ),
            'javascript': (
                "const nums = require('fs').readFileSync('/dev/stdin','utf8').trim().split(' ').map(Number);\n\n"
                "// TODO: move zeroes to end and print result"
            ),
            'java': (
                "import java.util.*;\n\n"
                "public class Solution {\n"
                "    public static void main(String[] args) {\n"
                "        String[] parts = new Scanner(System.in).nextLine().split(\" \");\n"
                "        int[] nums = Arrays.stream(parts).mapToInt(Integer::parseInt).toArray();\n\n"
                "        // TODO: move zeroes to end and print space-separated\n"
                "    }\n"
                "}"
            ),
            'cpp': (
                "#include <iostream>\n"
                "#include <sstream>\n"
                "#include <vector>\n"
                "using namespace std;\n"
                "int main() {\n"
                "    string line; getline(cin, line);\n"
                "    istringstream iss(line); int x;\n"
                "    vector<int> nums;\n"
                "    while (iss >> x) nums.push_back(x);\n"
                "    // TODO: move zeroes to end and print space-separated\n"
                "    return 0;\n"
                "}"
            ),
        },
        'testCases': [
            {'input': '[0, 1, 0, 3, 12]', 'stdin': '0 1 0 3 12', 'expected': '1 3 12 0 0', 'hidden': False},
            {'input': '[0]', 'stdin': '0', 'expected': '0', 'hidden': False},
            {'input': '[1, 0, 0, 2, 3]', 'stdin': '1 0 0 2 3', 'expected': '1 2 3 0 0', 'hidden': True},
            {'input': '[1, 2, 3]', 'stdin': '1 2 3', 'expected': '1 2 3', 'hidden': True},
        ],
    },

    'maxProfit': {
        'title': 'Best Time to Buy and Sell Stock',
        'difficulty': 'easy',
        'description': (
            "You are given a list of stock prices for n days (prices[i] is the price on day i).\n"
            "You can buy on one day and sell on a later day.\n"
            "Print the maximum profit possible.  If no profit is possible, print 0.\n\n"
            "Input format:  prices separated by spaces on one line representing the list of stock prices (e.g. 7 1 5 represents the array [7, 1, 5])\n"
            "Output format: one integer -- the maximum profit\n\n"
            "Example\n"
            "  Input Array:  [7, 1, 5, 3, 6, 4]\n"
            "  Output: 5    (buy at 1 on day 1, sell at 6 on day 4)"
        ),
        'constraints': ['1 <= n <= 100000', '0 <= price <= 10000'],
        'examples': [
            {'input': '[7, 1, 5, 3, 6, 4]', 'output': '5', 'explanation': 'buy at 1, sell at 6'},
            {'input': '[7, 6, 4, 3, 1]', 'output': '0', 'explanation': 'prices only fall -- no profit'},
        ],
        'functionSignature': None,
        'starterCode': {
            'python': (
                "prices = list(map(int, input().split()))\n\n"
                "# TODO: find the max profit and print it\n"
                "# Hint: track the minimum price seen so far as you scan left to right"
            ),
            'javascript': (
                "const prices = require('fs').readFileSync('/dev/stdin','utf8').trim().split(' ').map(Number);\n\n"
                "// TODO: find the max profit and print it"
            ),
            'java': (
                "import java.util.*;\n\n"
                "public class Solution {\n"
                "    public static void main(String[] args) {\n"
                "        int[] prices = Arrays.stream(new Scanner(System.in).nextLine().split(\" \"))\n"
                "                             .mapToInt(Integer::parseInt).toArray();\n\n"
                "        // TODO: find the max profit and print it\n"
                "    }\n"
                "}"
            ),
            'cpp': (
                "#include <iostream>\n"
                "#include <sstream>\n"
                "#include <vector>\n"
                "using namespace std;\n"
                "int main() {\n"
                "    string line; getline(cin, line);\n"
                "    istringstream iss(line); int x;\n"
                "    vector<int> prices;\n"
                "    while (iss >> x) prices.push_back(x);\n"
                "    // TODO: find the max profit and print it\n"
                "    return 0;\n"
                "}"
            ),
        },
        'testCases': [
            {'input': '[7, 1, 5, 3, 6, 4]', 'stdin': '7 1 5 3 6 4', 'expected': '5', 'hidden': False},
            {'input': '[7, 6, 4, 3, 1]', 'stdin': '7 6 4 3 1', 'expected': '0', 'hidden': False},
            {'input': '[1, 2]', 'stdin': '1 2', 'expected': '1', 'hidden': True},
            {'input': '[2, 4, 1]', 'stdin': '2 4 1', 'expected': '2', 'hidden': True},
        ],
    },

    'singleNumber': {
        'title': 'Find the Unique Number',
        'difficulty': 'easy',
        'description': (
            "Every number in the list appears exactly twice, except for one.\n"
            "Find and print that unique number.\n"
            "(Bonus challenge: can you do it without extra memory?)\n\n"
            "Input format:  integers separated by spaces on one line representing the list (e.g. -2 1 -3 represents the array [-2, 1, -3])\n"
            "Output format: one integer -- the unique number\n\n"
            "Example\n"
            "  Input Array:  [4, 1, 2, 1, 2]\n"
            "  Output: 4"
        ),
        'constraints': ['1 <= length <= 60000 (always odd)', 'All numbers except one appear exactly twice'],
        'examples': [
            {'input': '[2, 2, 1]', 'output': '1'},
            {'input': '[4, 1, 2, 1, 2]', 'output': '4'},
        ],
        'functionSignature': None,
        'starterCode': {
            'python': (
                "nums = list(map(int, input().split()))\n\n"
                "# TODO: find the number that appears only once and print it"
            ),
            'javascript': (
                "const nums = require('fs').readFileSync('/dev/stdin','utf8').trim().split(' ').map(Number);\n\n"
                "// TODO: find the unique number and print it"
            ),
            'java': (
                "import java.util.*;\n\n"
                "public class Solution {\n"
                "    public static void main(String[] args) {\n"
                "        int[] nums = Arrays.stream(new Scanner(System.in).nextLine().split(\" \"))\n"
                "                           .mapToInt(Integer::parseInt).toArray();\n\n"
                "        // TODO: find the unique number and print it\n"
                "    }\n"
                "}"
            ),
            'cpp': (
                "#include <iostream>\n"
                "#include <sstream>\n"
                "#include <vector>\n"
                "using namespace std;\n"
                "int main() {\n"
                "    string line; getline(cin, line);\n"
                "    istringstream iss(line); int x;\n"
                "    vector<int> nums;\n"
                "    while (iss >> x) nums.push_back(x);\n"
                "    // TODO: find the unique number and print it\n"
                "    return 0;\n"
                "}"
            ),
        },
        'testCases': [
            {'input': '[2, 2, 1]', 'stdin': '2 2 1', 'expected': '1', 'hidden': False},
            {'input': '[4, 1, 2, 1, 2]', 'stdin': '4 1 2 1 2', 'expected': '4', 'hidden': False},
            {'input': '[1]', 'stdin': '1', 'expected': '1', 'hidden': True},
            {'input': '[0, 0, 7, 4, 4]', 'stdin': '0 0 7 4 4', 'expected': '7', 'hidden': True},
        ],
    },

    'climbingStairs': {
        'title': 'Climbing Stairs',
        'difficulty': 'easy',
        'description': (
            "You are climbing a staircase with n steps.\n"
            "Each time you can climb 1 or 2 steps.\n"
            "Print the number of distinct ways to reach the top.\n\n"
            "Input format:  one integer n\n"
            "Output format: one integer -- the number of ways\n\n"
            "Example\n"
            "  Input:  3\n"
            "  Output: 3\n"
            "  (ways: 1+1+1,  1+2,  2+1)"
        ),
        'constraints': ['1 <= n <= 45'],
        'examples': [
            {'input': '2', 'output': '2', 'explanation': '(1+1) or (2)'},
            {'input': '3', 'output': '3', 'explanation': '(1+1+1), (1+2), (2+1)'},
        ],
        'functionSignature': None,
        'starterCode': {
            'python': (
                "n = int(input())\n\n"
                "# TODO: find number of ways to climb n stairs and print it\n"
                "# Hint: this is very similar to Fibonacci numbers"
            ),
            'javascript': (
                "const n = parseInt(require('fs').readFileSync('/dev/stdin','utf8').trim());\n\n"
                "// TODO: find number of ways to climb n stairs and print it"
            ),
            'java': (
                "import java.util.Scanner;\n\n"
                "public class Solution {\n"
                "    public static void main(String[] args) {\n"
                "        int n = new Scanner(System.in).nextInt();\n\n"
                "        // TODO: find number of ways to climb n stairs and print it\n"
                "    }\n"
                "}"
            ),
            'cpp': (
                "#include <iostream>\n"
                "using namespace std;\n"
                "int main() {\n"
                "    int n; cin >> n;\n"
                "    // TODO: find number of ways to climb n stairs and print it\n"
                "    return 0;\n"
                "}"
            ),
        },
        'testCases': [
            {'input': '2', 'stdin': '2', 'expected': '2', 'hidden': False},
            {'input': '3', 'stdin': '3', 'expected': '3', 'hidden': False},
            {'input': '5', 'stdin': '5', 'expected': '8', 'hidden': True},
            {'input': '10', 'stdin': '10', 'expected': '89', 'hidden': True},
        ],
    },

    'sortColors': {
        'title': 'Sort 0s, 1s and 2s',
        'difficulty': 'medium',
        'description': (
            "You have a list of numbers that are only 0, 1, or 2.\n"
            "Sort them so that all 0s come first, then 1s, then 2s.\n"
            "Print the sorted list, space-separated.\n"
            "(Try to do it in a single pass without using a sorting function.)\n\n"
            "Input format:  integers (0, 1, or 2) separated by spaces representing the list (e.g. 2 0 2 represents the array [2, 0, 2])\n"
            "Output format: the sorted integers, space-separated\n\n"
            "Example\n"
            "  Input Array:  [2, 0, 2, 1, 1, 0]\n"
            "  Output: 0 0 1 1 2 2"
        ),
        'constraints': ['1 <= length <= 300', 'Each number is 0, 1, or 2'],
        'examples': [
            {'input': '[2, 0, 2, 1, 1, 0]', 'output': '0 0 1 1 2 2'},
            {'input': '[2, 0, 1]', 'output': '0 1 2'},
        ],
        'functionSignature': None,
        'starterCode': {
            'python': (
                "nums = list(map(int, input().split()))\n\n"
                "# TODO: sort so 0s come first, then 1s, then 2s, and print\n"
                "# Hint: count how many 0s, 1s, and 2s there are"
            ),
            'javascript': (
                "const nums = require('fs').readFileSync('/dev/stdin','utf8').trim().split(' ').map(Number);\n\n"
                "// TODO: sort 0/1/2 and print"
            ),
            'java': (
                "import java.util.*;\n\n"
                "public class Solution {\n"
                "    public static void main(String[] args) {\n"
                "        int[] nums = Arrays.stream(new Scanner(System.in).nextLine().split(\" \"))\n"
                "                           .mapToInt(Integer::parseInt).toArray();\n\n"
                "        // TODO: sort 0/1/2 and print space-separated\n"
                "    }\n"
                "}"
            ),
            'cpp': (
                "#include <iostream>\n"
                "#include <sstream>\n"
                "#include <vector>\n"
                "using namespace std;\n"
                "int main() {\n"
                "    string line; getline(cin, line);\n"
                "    istringstream iss(line); int x;\n"
                "    vector<int> nums;\n"
                "    while (iss >> x) nums.push_back(x);\n"
                "    // TODO: sort 0/1/2 and print space-separated\n"
                "    return 0;\n"
                "}"
            ),
        },
        'testCases': [
            {'input': '[2, 0, 2, 1, 1, 0]', 'stdin': '2 0 2 1 1 0', 'expected': '0 0 1 1 2 2', 'hidden': False},
            {'input': '[2, 0, 1]', 'stdin': '2 0 1', 'expected': '0 1 2', 'hidden': False},
            {'input': '[0]', 'stdin': '0', 'expected': '0', 'hidden': True},
            {'input': '1 0 0 2 1', 'stdin': '1 0 0 2 1', 'expected': '0 0 1 1 2', 'hidden': True},
        ],
    },

    'longestCommonPrefix': {
        'title': 'Longest Common Prefix',
        'difficulty': 'easy',
        'description': (
            "Read several words (one per line, terminated by an empty line or EOF).\n"
            "Print the longest string that is a prefix of every word.\n"
            "If there is no common prefix, print an empty line.\n\n"
            "Input format:  words on separate lines (read until empty line or end of input)\n"
            "Output format: the longest common prefix (may be empty)\n\n"
            "Example\n"
            "  Input:\n"
            "    flower\n"
            "    flow\n"
            "    flight\n"
            "  Output: fl"
        ),
        'constraints': ['1 <= number of words <= 200', '0 <= word length <= 200'],
        'examples': [
            {'input': 'flower\nflow\nflight', 'output': 'fl', 'explanation': '"fl" is common to all three'},
            {'input': 'dog\nracecar\ncar', 'output': '', 'explanation': 'no common prefix'},
        ],
        'functionSignature': None,
        'starterCode': {
            'python': (
                "import sys\n"
                "words = [line.rstrip('\\n') for line in sys.stdin if line.strip()]\n\n"
                "# TODO: find the longest common prefix of all words and print it\n"
                "# Hint: start with words[0] as your prefix, then shorten it until it fits all words"
            ),
            'javascript': (
                "const words = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');\n\n"
                "// TODO: find the longest common prefix and print it (empty string if none)"
            ),
            'java': (
                "import java.util.*;\n\n"
                "public class Solution {\n"
                "    public static void main(String[] args) {\n"
                "        List<String> words = new ArrayList<>();\n"
                "        Scanner sc = new Scanner(System.in);\n"
                "        while (sc.hasNextLine()) {\n"
                "            String line = sc.nextLine();\n"
                "            if (!line.isEmpty()) words.add(line);\n"
                "        }\n\n"
                "        // TODO: find the longest common prefix and print it\n"
                "    }\n"
                "}"
            ),
            'cpp': (
                "#include <iostream>\n"
                "#include <vector>\n"
                "#include <string>\n"
                "using namespace std;\n"
                "int main() {\n"
                "    vector<string> words;\n"
                "    string line;\n"
                "    while (getline(cin, line)) if (!line.empty()) words.push_back(line);\n"
                "    // TODO: find the longest common prefix and print it\n"
                "    return 0;\n"
                "}"
            ),
        },
        'testCases': [
            {'input': 'flower\nflow\nflight', 'stdin': 'flower\nflow\nflight', 'expected': 'fl', 'hidden': False},
            {'input': 'dog\nracecar\ncar', 'stdin': 'dog\nracecar\ncar', 'expected': '', 'hidden': False},
            {'input': 'interview\ninter\nint', 'stdin': 'interview\ninter\nint', 'expected': 'int', 'hidden': True},
            {'input': 'a', 'stdin': 'a', 'expected': 'a', 'hidden': True},
        ],
    },
}

EASY_KEYS = [
    'reverseString', 'fibonacci', 'isPalindrome', 'factorial',
    'countVowels', 'binarySearch', 'fizzBuzz', 'missingNumber',
    'containsDuplicate', 'moveZeroes', 'singleNumber',
    'climbingStairs', 'maxProfit', 'longestCommonPrefix',
]
MEDIUM_KEYS = ['twoSum', 'maxSubarray', 'sortColors']
ALL_KEYS = EASY_KEYS + MEDIUM_KEYS
