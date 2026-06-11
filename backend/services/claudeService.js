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

// ─── Expanded problem bank — 25 diverse algorithmic problems ─────────────────
const PROBLEM_BANK = {
    twoSum: {
        title: 'Two Sum',
        difficulty: 'easy',
        description: 'Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`. You may assume exactly one solution exists, and you may not use the same element twice.',
        constraints: ['2 ≤ nums.length ≤ 10⁴', '-10⁹ ≤ nums[i] ≤ 10⁹', 'Exactly one valid answer exists'],
        examples: [
            { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'nums[0] + nums[1] = 2 + 7 = 9' },
            { input: 'nums = [3,2,4], target = 6', output: '[1,2]', explanation: 'nums[1] + nums[2] = 2 + 4 = 6' },
        ],
        functionSignature: 'twoSum',
        starterCode: 'function twoSum(nums, target) {\n    // your code here\n}',
        testCases: [
            { input: 'nums = [2,7,11,15], target = 9', inputCode: '[[2,7,11,15], 9]', expected: '[0,1]', expectedDisplay: '[0, 1]', hidden: false },
            { input: 'nums = [3,2,4], target = 6', inputCode: '[[3,2,4], 6]', expected: '[1,2]', expectedDisplay: '[1, 2]', hidden: false },
            { input: 'nums = [3,3], target = 6', inputCode: '[[3,3], 6]', expected: '[0,1]', expectedDisplay: '[0, 1]', hidden: true },
            { input: 'nums = [1,5,3,7], target = 8', inputCode: '[[1,5,3,7], 8]', expected: '[1,3]', expectedDisplay: '[1, 3]', hidden: true },
        ],
    },

    maxSubarray: {
        title: 'Maximum Subarray',
        difficulty: 'medium',
        description: 'Given an integer array `nums`, find the contiguous subarray which has the largest sum, and return its sum. A subarray must contain at least one number.',
        constraints: ['1 ≤ nums.length ≤ 10⁵', '-10⁴ ≤ nums[i] ≤ 10⁴'],
        examples: [
            { input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]', output: '6', explanation: 'Subarray [4,-1,2,1] has the largest sum = 6' },
            { input: 'nums = [5,4,-1,7,8]', output: '23', explanation: 'The entire array is the subarray' },
        ],
        functionSignature: 'maxSubarray',
        starterCode: 'function maxSubarray(nums) {\n    // your code here\n}',
        testCases: [
            { input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]', inputCode: '[[-2,1,-3,4,-1,2,1,-5,4]]', expected: '6', expectedDisplay: '6', hidden: false },
            { input: 'nums = [1]', inputCode: '[[1]]', expected: '1', expectedDisplay: '1', hidden: false },
            { input: 'nums = [5,4,-1,7,8]', inputCode: '[[5,4,-1,7,8]]', expected: '23', expectedDisplay: '23', hidden: true },
            { input: 'nums = [-1,-2,-3]', inputCode: '[[-1,-2,-3]]', expected: '-1', expectedDisplay: '-1', hidden: true },
        ],
    },

    reverseString: {
        title: 'Reverse String',
        difficulty: 'easy',
        description: 'Write a function that reverses a string. The input string is given as a character array. You must do it in-place with O(1) extra memory. Return the reversed string.',
        constraints: ['1 ≤ s.length ≤ 10⁵', 's[i] is a printable ASCII character'],
        examples: [
            { input: 's = "hello"', output: '"olleh"' },
            { input: 's = "Hannah"', output: '"hannaH"' },
        ],
        functionSignature: 'reverseString',
        starterCode: 'function reverseString(s) {\n    // your code here\n}',
        testCases: [
            { input: 's = "hello"', inputCode: '["hello"]', expected: '"olleh"', expectedDisplay: '"olleh"', hidden: false },
            { input: 's = "Hannah"', inputCode: '["Hannah"]', expected: '"hannaH"', expectedDisplay: '"hannaH"', hidden: false },
            { input: 's = "racecar"', inputCode: '["racecar"]', expected: '"racecar"', expectedDisplay: '"racecar"', hidden: true },
            { input: 's = "abcde"', inputCode: '["abcde"]', expected: '"edcba"', expectedDisplay: '"edcba"', hidden: true },
        ],
    },

    fibonacci: {
        title: 'Fibonacci Number',
        difficulty: 'easy',
        description: 'The Fibonacci numbers form a sequence where each number is the sum of the two preceding ones. Given `n`, calculate `F(n)` where F(0) = 0, F(1) = 1.',
        constraints: ['0 ≤ n ≤ 30'],
        examples: [
            { input: 'n = 5', output: '5', explanation: 'F(5) = F(4) + F(3) = 3 + 2 = 5' },
            { input: 'n = 10', output: '55', explanation: 'F(10) = 55' },
        ],
        functionSignature: 'fibonacci',
        starterCode: 'function fibonacci(n) {\n    // your code here\n}',
        testCases: [
            { input: 'n = 5', inputCode: '[5]', expected: '5', expectedDisplay: '5', hidden: false },
            { input: 'n = 10', inputCode: '[10]', expected: '55', expectedDisplay: '55', hidden: false },
            { input: 'n = 0', inputCode: '[0]', expected: '0', expectedDisplay: '0', hidden: true },
            { input: 'n = 1', inputCode: '[1]', expected: '1', expectedDisplay: '1', hidden: true },
        ],
    },

    isPalindrome: {
        title: 'Valid Palindrome',
        difficulty: 'easy',
        description: 'A phrase is a palindrome if, after converting all uppercase letters to lowercase and removing all non-alphanumeric characters, it reads the same forward and backward. Given a string `s`, return `true` if it is a palindrome, or `false` otherwise.',
        constraints: ['1 ≤ s.length ≤ 2 × 10⁵', 's consists only of printable ASCII characters'],
        examples: [
            { input: 's = "racecar"', output: 'true', explanation: '"racecar" reads the same forwards and backwards' },
            { input: 's = "hello"', output: 'false', explanation: '"hello" is not a palindrome' },
        ],
        functionSignature: 'isPalindrome',
        starterCode: 'function isPalindrome(s) {\n    // your code here\n}',
        testCases: [
            { input: 's = "racecar"', inputCode: '["racecar"]', expected: 'true', expectedDisplay: 'true', hidden: false },
            { input: 's = "hello"', inputCode: '["hello"]', expected: 'false', expectedDisplay: 'false', hidden: false },
            { input: 's = "A man a plan a canal Panama"', inputCode: '["amanaplanacanalpanama"]', expected: 'true', expectedDisplay: 'true', hidden: true },
            { input: 's = "race a car"', inputCode: '["race a car"]', expected: 'false', expectedDisplay: 'false', hidden: true },
        ],
    },

    factorial: {
        title: 'Factorial',
        difficulty: 'easy',
        description: 'Given a non-negative integer `n`, return its factorial. The factorial of n is defined as n! = 1 × 2 × … × n. Special case: 0! = 1.',
        constraints: ['0 ≤ n ≤ 12'],
        examples: [
            { input: 'n = 5', output: '120', explanation: '5! = 5 × 4 × 3 × 2 × 1 = 120' },
            { input: 'n = 0', output: '1', explanation: '0! = 1 by definition' },
        ],
        functionSignature: 'factorial',
        starterCode: 'function factorial(n) {\n    // your code here\n}',
        testCases: [
            { input: 'n = 5', inputCode: '[5]', expected: '120', expectedDisplay: '120', hidden: false },
            { input: 'n = 0', inputCode: '[0]', expected: '1', expectedDisplay: '1', hidden: false },
            { input: 'n = 7', inputCode: '[7]', expected: '5040', expectedDisplay: '5040', hidden: true },
            { input: 'n = 1', inputCode: '[1]', expected: '1', expectedDisplay: '1', hidden: true },
        ],
    },

    binarySearch: {
        title: 'Binary Search',
        difficulty: 'easy',
        description: 'Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, return its index. Otherwise, return -1. You must write an algorithm with O(log n) runtime complexity.',
        constraints: ['1 ≤ nums.length ≤ 10⁴', '-10⁴ < nums[i], target < 10⁴', 'All integers in nums are unique', 'nums is sorted in ascending order'],
        examples: [
            { input: 'nums = [-1,0,3,5,9,12], target = 9', output: '4', explanation: '9 exists at index 4' },
            { input: 'nums = [-1,0,3,5,9,12], target = 2', output: '-1', explanation: '2 does not exist in nums' },
        ],
        functionSignature: 'binarySearch',
        starterCode: 'function binarySearch(nums, target) {\n    // return index, or -1 if not found\n}',
        testCases: [
            { input: 'nums = [-1,0,3,5,9,12], target = 9', inputCode: '[[-1,0,3,5,9,12], 9]', expected: '4', expectedDisplay: '4', hidden: false },
            { input: 'nums = [-1,0,3,5,9,12], target = 2', inputCode: '[[-1,0,3,5,9,12], 2]', expected: '-1', expectedDisplay: '-1', hidden: false },
            { input: 'nums = [1], target = 1', inputCode: '[[1], 1]', expected: '0', expectedDisplay: '0', hidden: true },
            { input: 'nums = [1,3,5,7,9], target = 6', inputCode: '[[1,3,5,7,9], 6]', expected: '-1', expectedDisplay: '-1', hidden: true },
        ],
    },

    validParentheses: {
        title: 'Valid Parentheses',
        difficulty: 'easy',
        description: 'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid. A string is valid if every open bracket is closed by the same type of bracket in the correct order.',
        constraints: ['1 ≤ s.length ≤ 10⁴', 's consists of parentheses only ()[]{}'],
        examples: [
            { input: 's = "()"', output: 'true' },
            { input: 's = "()[]{}"', output: 'true' },
            { input: 's = "(]"', output: 'false' },
        ],
        functionSignature: 'isValid',
        starterCode: 'function isValid(s) {\n    // your code here\n}',
        testCases: [
            { input: 's = "()"', inputCode: '["()"]', expected: 'true', expectedDisplay: 'true', hidden: false },
            { input: 's = "()[]{}"', inputCode: '["()[]{}"]', expected: 'true', expectedDisplay: 'true', hidden: false },
            { input: 's = "(]"', inputCode: '["(]"]', expected: 'false', expectedDisplay: 'false', hidden: true },
            { input: 's = "([)]"', inputCode: '["([)]"]', expected: 'false', expectedDisplay: 'false', hidden: true },
        ],
    },

    climbingStairs: {
        title: 'Climbing Stairs',
        difficulty: 'easy',
        description: 'You are climbing a staircase. It takes `n` steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
        constraints: ['1 ≤ n ≤ 45'],
        examples: [
            { input: 'n = 2', output: '2', explanation: 'Two ways: (1+1) or (2)' },
            { input: 'n = 3', output: '3', explanation: 'Three ways: (1+1+1), (1+2), (2+1)' },
        ],
        functionSignature: 'climbStairs',
        starterCode: 'function climbStairs(n) {\n    // your code here\n}',
        testCases: [
            { input: 'n = 2', inputCode: '[2]', expected: '2', expectedDisplay: '2', hidden: false },
            { input: 'n = 3', inputCode: '[3]', expected: '3', expectedDisplay: '3', hidden: false },
            { input: 'n = 5', inputCode: '[5]', expected: '8', expectedDisplay: '8', hidden: true },
            { input: 'n = 10', inputCode: '[10]', expected: '89', expectedDisplay: '89', hidden: true },
        ],
    },

    mergeSortedArrays: {
        title: 'Merge Sorted Array',
        difficulty: 'easy',
        description: 'You are given two integer arrays `nums1` and `nums2`, sorted in non-decreasing order. Merge `nums2` into `nums1` as one sorted array and return it. The number of elements initialized in `nums1` and `nums2` are `m` and `n` respectively.',
        constraints: ['nums1.length == m + n', 'nums2.length == n', '0 ≤ m, n ≤ 200'],
        examples: [
            { input: 'nums1 = [1,2,3], nums2 = [2,5,6]', output: '[1,2,2,3,5,6]' },
            { input: 'nums1 = [1], nums2 = []', output: '[1]' },
        ],
        functionSignature: 'mergeSortedArrays',
        starterCode: 'function mergeSortedArrays(nums1, nums2) {\n    // return merged sorted array\n}',
        testCases: [
            { input: 'nums1 = [1,2,3], nums2 = [2,5,6]', inputCode: '[[1,2,3],[2,5,6]]', expected: '[1,2,2,3,5,6]', expectedDisplay: '[1,2,2,3,5,6]', hidden: false },
            { input: 'nums1 = [1], nums2 = []', inputCode: '[[1],[]]', expected: '[1]', expectedDisplay: '[1]', hidden: false },
            { input: 'nums1 = [], nums2 = [1]', inputCode: '[[],[1]]', expected: '[1]', expectedDisplay: '[1]', hidden: true },
            { input: 'nums1 = [1,3,5], nums2 = [2,4,6]', inputCode: '[[1,3,5],[2,4,6]]', expected: '[1,2,3,4,5,6]', expectedDisplay: '[1,2,3,4,5,6]', hidden: true },
        ],
    },

    countVowels: {
        title: 'Count Vowels',
        difficulty: 'easy',
        description: 'Given a string `s`, return the number of vowels in the string. Vowels are: a, e, i, o, u (both uppercase and lowercase count).',
        constraints: ['1 ≤ s.length ≤ 10⁵', 's consists of printable ASCII characters'],
        examples: [
            { input: 's = "hello"', output: '2', explanation: 'e and o are vowels' },
            { input: 's = "Interview"', output: '4', explanation: 'I, e, i, e are vowels' },
        ],
        functionSignature: 'countVowels',
        starterCode: 'function countVowels(s) {\n    // your code here\n}',
        testCases: [
            { input: 's = "hello"', inputCode: '["hello"]', expected: '2', expectedDisplay: '2', hidden: false },
            { input: 's = "Interview"', inputCode: '["Interview"]', expected: '4', expectedDisplay: '4', hidden: false },
            { input: 's = "rhythm"', inputCode: '["rhythm"]', expected: '0', expectedDisplay: '0', hidden: true },
            { input: 's = "aeiou"', inputCode: '["aeiou"]', expected: '5', expectedDisplay: '5', hidden: true },
        ],
    },

    removeDuplicates: {
        title: 'Remove Duplicates from Sorted Array',
        difficulty: 'easy',
        description: 'Given an integer array `nums` sorted in non-decreasing order, remove duplicates in-place such that each unique element appears only once. Return the array of unique elements in sorted order.',
        constraints: ['1 ≤ nums.length ≤ 3 × 10⁴', '-100 ≤ nums[i] ≤ 100', 'nums is sorted in non-decreasing order'],
        examples: [
            { input: 'nums = [1,1,2]', output: '[1,2]' },
            { input: 'nums = [0,0,1,1,1,2,2,3,3,4]', output: '[0,1,2,3,4]' },
        ],
        functionSignature: 'removeDuplicates',
        starterCode: 'function removeDuplicates(nums) {\n    // return array with duplicates removed\n}',
        testCases: [
            { input: 'nums = [1,1,2]', inputCode: '[[1,1,2]]', expected: '[1,2]', expectedDisplay: '[1,2]', hidden: false },
            { input: 'nums = [0,0,1,1,1,2,2,3,3,4]', inputCode: '[[0,0,1,1,1,2,2,3,3,4]]', expected: '[0,1,2,3,4]', expectedDisplay: '[0,1,2,3,4]', hidden: false },
            { input: 'nums = [1,2,3]', inputCode: '[[1,2,3]]', expected: '[1,2,3]', expectedDisplay: '[1,2,3]', hidden: true },
            { input: 'nums = [1,1,1,1]', inputCode: '[[1,1,1,1]]', expected: '[1]', expectedDisplay: '[1]', hidden: true },
        ],
    },

    longestCommonPrefix: {
        title: 'Longest Common Prefix',
        difficulty: 'easy',
        description: 'Write a function to find the longest common prefix string amongst an array of strings. If there is no common prefix, return an empty string `""`.',
        constraints: ['1 ≤ strs.length ≤ 200', '0 ≤ strs[i].length ≤ 200', 'strs[i] consists of only lowercase English letters'],
        examples: [
            { input: 'strs = ["flower","flow","flight"]', output: '"fl"', explanation: 'Common prefix is "fl"' },
            { input: 'strs = ["dog","racecar","car"]', output: '""', explanation: 'No common prefix' },
        ],
        functionSignature: 'longestCommonPrefix',
        starterCode: 'function longestCommonPrefix(strs) {\n    // your code here\n}',
        testCases: [
            { input: 'strs = ["flower","flow","flight"]', inputCode: '[["flower","flow","flight"]]', expected: '"fl"', expectedDisplay: '"fl"', hidden: false },
            { input: 'strs = ["dog","racecar","car"]', inputCode: '[["dog","racecar","car"]]', expected: '""', expectedDisplay: '""', hidden: false },
            { input: 'strs = ["interview","inter","int"]', inputCode: '[["interview","inter","int"]]', expected: '"int"', expectedDisplay: '"int"', hidden: true },
            { input: 'strs = ["a"]', inputCode: '[["a"]]', expected: '"a"', expectedDisplay: '"a"', hidden: true },
        ],
    },

    fizzBuzz: {
        title: 'FizzBuzz',
        difficulty: 'easy',
        description: 'Given an integer `n`, return an array of strings from 1 to n where: multiples of 3 are "Fizz", multiples of 5 are "Buzz", multiples of both 3 and 5 are "FizzBuzz", and all other numbers are the number itself as a string.',
        constraints: ['1 ≤ n ≤ 10⁴'],
        examples: [
            { input: 'n = 5', output: '["1","2","Fizz","4","Buzz"]' },
            { input: 'n = 15', output: '["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]' },
        ],
        functionSignature: 'fizzBuzz',
        starterCode: 'function fizzBuzz(n) {\n    // return array of strings\n}',
        testCases: [
            { input: 'n = 3', inputCode: '[3]', expected: '["1","2","Fizz"]', expectedDisplay: '["1","2","Fizz"]', hidden: false },
            { input: 'n = 5', inputCode: '[5]', expected: '["1","2","Fizz","4","Buzz"]', expectedDisplay: '["1","2","Fizz","4","Buzz"]', hidden: false },
            { input: 'n = 15', inputCode: '[15]', expected: '["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]', expectedDisplay: '...FizzBuzz at 15', hidden: true },
            { input: 'n = 1', inputCode: '[1]', expected: '["1"]', expectedDisplay: '["1"]', hidden: true },
        ],
    },

    reverseInteger: {
        title: 'Reverse Integer',
        difficulty: 'medium',
        description: 'Given a signed 32-bit integer `x`, return `x` with its digits reversed. If reversing `x` causes the value to go outside the signed 32-bit integer range [-2³¹, 2³¹ - 1], return 0.',
        constraints: ['-2³¹ ≤ x ≤ 2³¹ - 1'],
        examples: [
            { input: 'x = 123', output: '321' },
            { input: 'x = -123', output: '-321' },
            { input: 'x = 120', output: '21' },
        ],
        functionSignature: 'reverseInteger',
        starterCode: 'function reverseInteger(x) {\n    // your code here\n}',
        testCases: [
            { input: 'x = 123', inputCode: '[123]', expected: '321', expectedDisplay: '321', hidden: false },
            { input: 'x = -123', inputCode: '[-123]', expected: '-321', expectedDisplay: '-321', hidden: false },
            { input: 'x = 120', inputCode: '[120]', expected: '21', expectedDisplay: '21', hidden: true },
            { input: 'x = 0', inputCode: '[0]', expected: '0', expectedDisplay: '0', hidden: true },
        ],
    },

    missingNumber: {
        title: 'Missing Number',
        difficulty: 'easy',
        description: 'Given an array `nums` containing `n` distinct numbers in the range `[0, n]`, return the only number in the range that is missing from the array.',
        constraints: ['n == nums.length', '1 ≤ n ≤ 10⁴', '0 ≤ nums[i] ≤ n', 'All numbers in nums are unique'],
        examples: [
            { input: 'nums = [3,0,1]', output: '2', explanation: 'n = 3, range is [0,3], 2 is missing' },
            { input: 'nums = [0,1]', output: '2', explanation: 'n = 2, range is [0,2], 2 is missing' },
        ],
        functionSignature: 'missingNumber',
        starterCode: 'function missingNumber(nums) {\n    // your code here\n}',
        testCases: [
            { input: 'nums = [3,0,1]', inputCode: '[[3,0,1]]', expected: '2', expectedDisplay: '2', hidden: false },
            { input: 'nums = [0,1]', inputCode: '[[0,1]]', expected: '2', expectedDisplay: '2', hidden: false },
            { input: 'nums = [9,6,4,2,3,5,7,0,1]', inputCode: '[[9,6,4,2,3,5,7,0,1]]', expected: '8', expectedDisplay: '8', hidden: true },
            { input: 'nums = [0]', inputCode: '[[0]]', expected: '1', expectedDisplay: '1', hidden: true },
        ],
    },

    containsDuplicate: {
        title: 'Contains Duplicate',
        difficulty: 'easy',
        description: 'Given an integer array `nums`, return `true` if any value appears at least twice in the array, and return `false` if every element is distinct.',
        constraints: ['1 ≤ nums.length ≤ 10⁵', '-10⁹ ≤ nums[i] ≤ 10⁹'],
        examples: [
            { input: 'nums = [1,2,3,1]', output: 'true', explanation: '1 appears twice' },
            { input: 'nums = [1,2,3,4]', output: 'false', explanation: 'All elements distinct' },
        ],
        functionSignature: 'containsDuplicate',
        starterCode: 'function containsDuplicate(nums) {\n    // your code here\n}',
        testCases: [
            { input: 'nums = [1,2,3,1]', inputCode: '[[1,2,3,1]]', expected: 'true', expectedDisplay: 'true', hidden: false },
            { input: 'nums = [1,2,3,4]', inputCode: '[[1,2,3,4]]', expected: 'false', expectedDisplay: 'false', hidden: false },
            { input: 'nums = [1,1,1,3,3,4,3,2,4,2]', inputCode: '[[1,1,1,3,3,4,3,2,4,2]]', expected: 'true', expectedDisplay: 'true', hidden: true },
            { input: 'nums = [1]', inputCode: '[[1]]', expected: 'false', expectedDisplay: 'false', hidden: true },
        ],
    },

    moveZeroes: {
        title: 'Move Zeroes',
        difficulty: 'easy',
        description: 'Given an integer array `nums`, move all `0`s to the end of it while maintaining the relative order of the non-zero elements. Return the resulting array. Do it in-place.',
        constraints: ['1 ≤ nums.length ≤ 10⁴', '-2³¹ ≤ nums[i] ≤ 2³¹ - 1'],
        examples: [
            { input: 'nums = [0,1,0,3,12]', output: '[1,3,12,0,0]' },
            { input: 'nums = [0]', output: '[0]' },
        ],
        functionSignature: 'moveZeroes',
        starterCode: 'function moveZeroes(nums) {\n    // move zeroes to end, return array\n}',
        testCases: [
            { input: 'nums = [0,1,0,3,12]', inputCode: '[[0,1,0,3,12]]', expected: '[1,3,12,0,0]', expectedDisplay: '[1,3,12,0,0]', hidden: false },
            { input: 'nums = [0]', inputCode: '[[0]]', expected: '[0]', expectedDisplay: '[0]', hidden: false },
            { input: 'nums = [1,0,0,2,3]', inputCode: '[[1,0,0,2,3]]', expected: '[1,2,3,0,0]', expectedDisplay: '[1,2,3,0,0]', hidden: true },
            { input: 'nums = [1,2,3]', inputCode: '[[1,2,3]]', expected: '[1,2,3]', expectedDisplay: '[1,2,3]', hidden: true },
        ],
    },

    singleNumber: {
        title: 'Single Number',
        difficulty: 'easy',
        description: 'Given a non-empty array of integers `nums`, every element appears twice except for one. Find that single one. Your solution must run in O(n) time and use only O(1) extra space.',
        constraints: ['1 ≤ nums.length ≤ 3 × 10⁴', '-3 × 10⁴ ≤ nums[i] ≤ 3 × 10⁴', 'Every element appears exactly twice except for one element'],
        examples: [
            { input: 'nums = [2,2,1]', output: '1' },
            { input: 'nums = [4,1,2,1,2]', output: '4' },
        ],
        functionSignature: 'singleNumber',
        starterCode: 'function singleNumber(nums) {\n    // your code here\n}',
        testCases: [
            { input: 'nums = [2,2,1]', inputCode: '[[2,2,1]]', expected: '1', expectedDisplay: '1', hidden: false },
            { input: 'nums = [4,1,2,1,2]', inputCode: '[[4,1,2,1,2]]', expected: '4', expectedDisplay: '4', hidden: false },
            { input: 'nums = [1]', inputCode: '[[1]]', expected: '1', expectedDisplay: '1', hidden: true },
            { input: 'nums = [0,0,7,4,4]', inputCode: '[[0,0,7,4,4]]', expected: '7', expectedDisplay: '7', hidden: true },
        ],
    },

    maxProfit: {
        title: 'Best Time to Buy and Sell Stock',
        difficulty: 'easy',
        description: 'You are given an array `prices` where `prices[i]` is the price of a given stock on the i-th day. You want to maximize your profit by choosing a single day to buy and a later day to sell. Return the maximum profit you can achieve. If no profit is possible, return 0.',
        constraints: ['1 ≤ prices.length ≤ 10⁵', '0 ≤ prices[i] ≤ 10⁴'],
        examples: [
            { input: 'prices = [7,1,5,3,6,4]', output: '5', explanation: 'Buy on day 2 (price=1), sell on day 5 (price=6), profit = 6-1 = 5' },
            { input: 'prices = [7,6,4,3,1]', output: '0', explanation: 'No profitable transaction possible' },
        ],
        functionSignature: 'maxProfit',
        starterCode: 'function maxProfit(prices) {\n    // your code here\n}',
        testCases: [
            { input: 'prices = [7,1,5,3,6,4]', inputCode: '[[7,1,5,3,6,4]]', expected: '5', expectedDisplay: '5', hidden: false },
            { input: 'prices = [7,6,4,3,1]', inputCode: '[[7,6,4,3,1]]', expected: '0', expectedDisplay: '0', hidden: false },
            { input: 'prices = [1,2]', inputCode: '[[1,2]]', expected: '1', expectedDisplay: '1', hidden: true },
            { input: 'prices = [2,4,1]', inputCode: '[[2,4,1]]', expected: '2', expectedDisplay: '2', hidden: true },
        ],
    },

    productExceptSelf: {
        title: 'Product of Array Except Self',
        difficulty: 'medium',
        description: 'Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`. You must write an algorithm that runs in O(n) time and without using the division operation.',
        constraints: ['2 ≤ nums.length ≤ 10⁵', '-30 ≤ nums[i] ≤ 30'],
        examples: [
            { input: 'nums = [1,2,3,4]', output: '[24,12,8,6]' },
            { input: 'nums = [-1,1,0,-3,3]', output: '[0,0,9,0,0]' },
        ],
        functionSignature: 'productExceptSelf',
        starterCode: 'function productExceptSelf(nums) {\n    // your code here\n}',
        testCases: [
            { input: 'nums = [1,2,3,4]', inputCode: '[[1,2,3,4]]', expected: '[24,12,8,6]', expectedDisplay: '[24,12,8,6]', hidden: false },
            { input: 'nums = [2,3,4]', inputCode: '[[2,3,4]]', expected: '[12,8,6]', expectedDisplay: '[12,8,6]', hidden: false },
            { input: 'nums = [-1,1,0,-3,3]', inputCode: '[[-1,1,0,-3,3]]', expected: '[0,0,9,0,0]', expectedDisplay: '[0,0,9,0,0]', hidden: true },
            { input: 'nums = [1,1]', inputCode: '[[1,1]]', expected: '[1,1]', expectedDisplay: '[1,1]', hidden: true },
        ],
    },

    twoSumII: {
        title: 'Two Sum II (Sorted Array)',
        difficulty: 'medium',
        description: 'Given a 1-indexed array of integers `numbers` that is already sorted in non-decreasing order, find two numbers that add up to a specific `target` number. Return their indices as [index1, index2] (1-indexed). Use O(1) extra space.',
        constraints: ['2 ≤ numbers.length ≤ 3 × 10⁴', '-1000 ≤ numbers[i] ≤ 1000', 'Exactly one solution exists'],
        examples: [
            { input: 'numbers = [2,7,11,15], target = 9', output: '[1,2]', explanation: 'numbers[1] + numbers[2] = 2 + 7 = 9' },
            { input: 'numbers = [2,3,4], target = 6', output: '[1,3]' },
        ],
        functionSignature: 'twoSumII',
        starterCode: 'function twoSumII(numbers, target) {\n    // return 1-indexed pair\n}',
        testCases: [
            { input: 'numbers = [2,7,11,15], target = 9', inputCode: '[[2,7,11,15], 9]', expected: '[1,2]', expectedDisplay: '[1,2]', hidden: false },
            { input: 'numbers = [2,3,4], target = 6', inputCode: '[[2,3,4], 6]', expected: '[1,3]', expectedDisplay: '[1,3]', hidden: false },
            { input: 'numbers = [-1,0], target = -1', inputCode: '[[-1,0], -1]', expected: '[1,2]', expectedDisplay: '[1,2]', hidden: true },
            { input: 'numbers = [1,2,3,4], target = 7', inputCode: '[[1,2,3,4], 7]', expected: '[3,4]', expectedDisplay: '[3,4]', hidden: true },
        ],
    },

    groupAnagrams: {
        title: 'Group Anagrams',
        difficulty: 'medium',
        description: 'Given an array of strings `strs`, group the anagrams together. You can return the answer in any order. An anagram is a word formed by rearranging all letters of a different word.',
        constraints: ['1 ≤ strs.length ≤ 10⁴', '0 ≤ strs[i].length ≤ 100', 'strs[i] consists of lowercase English letters'],
        examples: [
            { input: 'strs = ["eat","tea","tan","ate","nat","bat"]', output: '[["bat"],["nat","tan"],["ate","eat","tea"]]', explanation: 'Group words that are anagrams of each other' },
        ],
        functionSignature: 'groupAnagrams',
        starterCode: 'function groupAnagrams(strs) {\n    // return grouped anagrams (order within groups does not matter)\n}',
        testCases: [
            { input: 'strs = ["eat","tea","tan","ate","nat","bat"]', inputCode: '[["eat","tea","tan","ate","nat","bat"]]', expected: '[["bat"],["nat","tan"],["ate","eat","tea"]]', expectedDisplay: '3 groups', hidden: false },
            { input: 'strs = [""]', inputCode: '[[""]]', expected: '[[""]]', expectedDisplay: '[[""]]', hidden: false },
            { input: 'strs = ["a"]', inputCode: '[["a"]]', expected: '[["a"]]', expectedDisplay: '[["a"]]', hidden: true },
            { input: 'strs = ["abc","bca","cab","xyz"]', inputCode: '[["abc","bca","cab","xyz"]]', expected: '[["abc","bca","cab"],["xyz"]]', expectedDisplay: '2 groups', hidden: true },
        ],
    },

    maxDepthBinaryTree: {
        title: 'Maximum Depth of Binary Tree',
        difficulty: 'easy',
        description: 'Given a binary tree represented as an array (level-order), return its maximum depth. The maximum depth is the number of nodes along the longest path from the root node to the farthest leaf node. null represents a missing node.',
        constraints: ['The number of nodes is in range [0, 10⁴]', '-100 ≤ Node.val ≤ 100'],
        examples: [
            { input: 'root = [3,9,20,null,null,15,7]', output: '3' },
            { input: 'root = [1,null,2]', output: '2' },
        ],
        functionSignature: 'maxDepth',
        starterCode: 'function maxDepth(root) {\n    // root is an array in level-order (null = missing node)\n    // return max depth\n}',
        testCases: [
            { input: 'root = [3,9,20,null,null,15,7]', inputCode: '[[3,9,20,null,null,15,7]]', expected: '3', expectedDisplay: '3', hidden: false },
            { input: 'root = [1,null,2]', inputCode: '[[1,null,2]]', expected: '2', expectedDisplay: '2', hidden: false },
            { input: 'root = []', inputCode: '[[]]', expected: '0', expectedDisplay: '0', hidden: true },
            { input: 'root = [1]', inputCode: '[[1]]', expected: '1', expectedDisplay: '1', hidden: true },
        ],
    },

    sortColors: {
        title: 'Sort Colors (Dutch Flag)',
        difficulty: 'medium',
        description: 'Given an array `nums` with n objects colored red (0), white (1), or blue (2), sort them in-place so that objects of the same color are adjacent, in the order red, white, and blue. Return the sorted array. You must solve this in one pass using O(1) space.',
        constraints: ['n == nums.length', '1 ≤ n ≤ 300', 'nums[i] is either 0, 1, or 2'],
        examples: [
            { input: 'nums = [2,0,2,1,1,0]', output: '[0,0,1,1,2,2]' },
            { input: 'nums = [2,0,1]', output: '[0,1,2]' },
        ],
        functionSignature: 'sortColors',
        starterCode: 'function sortColors(nums) {\n    // sort in-place, return array\n}',
        testCases: [
            { input: 'nums = [2,0,2,1,1,0]', inputCode: '[[2,0,2,1,1,0]]', expected: '[0,0,1,1,2,2]', expectedDisplay: '[0,0,1,1,2,2]', hidden: false },
            { input: 'nums = [2,0,1]', inputCode: '[[2,0,1]]', expected: '[0,1,2]', expectedDisplay: '[0,1,2]', hidden: false },
            { input: 'nums = [0]', inputCode: '[[0]]', expected: '[0]', expectedDisplay: '[0]', hidden: true },
            { input: 'nums = [1,0,0,2,1]', inputCode: '[[1,0,0,2,1]]', expected: '[0,0,1,1,2]', expectedDisplay: '[0,0,1,1,2]', hidden: true },
        ],
    },
};

const PROBLEM_KEYS = Object.keys(PROBLEM_BANK);

// ─── Pool selection with anti-repetition using a per-session used-set ─────────
// We keep track of which problems were recently generated so the same session
// never repeats. The set is module-level but very lightweight.
const _recentlyUsed = new Set();

function pickRandomProblem(exclude = []) {
    const excludeSet = new Set([..._recentlyUsed, ...exclude]);
    const available = PROBLEM_KEYS.filter(k => !excludeSet.has(k));
    // Reset cooldown when pool is exhausted
    const pool = available.length >= 2 ? available : PROBLEM_KEYS.filter(k => !new Set(exclude).has(k));
    const key = pool[Math.floor(Math.random() * pool.length)];
    _recentlyUsed.add(key);
    if (_recentlyUsed.size > Math.floor(PROBLEM_KEYS.length * 0.6)) _recentlyUsed.clear();
    return { key, ...PROBLEM_BANK[key] };
}

// Pick two distinct problems for a session, biased by experience level
function pickProblemsForSession(expLevel = 'mid') {
    const easyKeys = ['twoSum', 'reverseString', 'fibonacci', 'isPalindrome', 'factorial', 'binarySearch', 'climbingStairs', 'countVowels', 'removeDuplicates', 'fizzBuzz', 'missingNumber', 'containsDuplicate', 'moveZeroes', 'singleNumber', 'maxProfit'];
    const mediumKeys = ['maxSubarray', 'validParentheses', 'mergeSortedArrays', 'longestCommonPrefix', 'reverseInteger', 'productExceptSelf', 'twoSumII', 'groupAnagrams', 'maxDepthBinaryTree', 'sortColors'];

    let pool1, pool2;
    if (expLevel === 'entry') {
        pool1 = easyKeys; pool2 = easyKeys;
    } else if (expLevel === 'mid') {
        pool1 = easyKeys; pool2 = [...easyKeys, ...mediumKeys];
    } else {
        // senior / lead
        pool1 = [...easyKeys, ...mediumKeys]; pool2 = mediumKeys;
    }

    const available1 = pool1.filter(k => !_recentlyUsed.has(k));
    const key1 = (available1.length ? available1 : pool1)[Math.floor(Math.random() * (available1.length || pool1.length))];
    _recentlyUsed.add(key1);

    const pool2filtered = pool2.filter(k => k !== key1 && !_recentlyUsed.has(k));
    const key2 = (pool2filtered.length ? pool2filtered : pool2.filter(k => k !== key1))[
        Math.floor(Math.random() * Math.max(pool2filtered.length, 1))
    ] || pool2.find(k => k !== key1) || pool2[0];
    _recentlyUsed.add(key2);

    if (_recentlyUsed.size > Math.floor(PROBLEM_KEYS.length * 0.5)) _recentlyUsed.clear();

    return [{ key: key1, ...PROBLEM_BANK[key1] }, { key: key2, ...PROBLEM_BANK[key2] }];
}

async function parseResumeAndGenerateQuestions({ resumeText, role, expLevel }) {
    // Pick 2 coding problems BEFORE calling the AI so we inject them directly
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
Q9: id=9, section=2, category="coding", text="${codingQ1.description}", functionSignature="${codingQ1.functionSignature}", title="${codingQ1.title}", difficulty="${codingQ1.difficulty}"
Q10: id=10, section=2, category="coding", text="${codingQ2.description}", functionSignature="${codingQ2.functionSignature}", title="${codingQ2.title}", difficulty="${codingQ2.difficulty}"

Respond ONLY with valid JSON, no markdown, no backticks:
{
  "skills": ["skill1","skill2"],
  "experience": [{"title":"","company":"","duration":""}],
  "summary": "one sentence",
  "questions": [
    {"id":1,"section":1,"text":"...","type":"technical","category":"mcq","options":["A","B","C","D"],"correctAnswer":0,"language":null,"explanation":"...","functionSignature":null,"starterCode":null,"testCases":null,"title":null,"difficulty":null},
    ...8 MCQ questions with IDs 1-8...,
    {"id":9,"section":2, ... codingQ1 verbatim ...},
    {"id":10,"section":2, ... codingQ2 verbatim ...},
    ...6 open questions with IDs 11-16 for section 3...
  ]
}

For open questions (IDs 11-16): generate role-specific questions. IDs 11-14 are technical (category:"technical"), IDs 15-16 are behavioral (category:"behavioral", type:"behavioral").
Generate ALL 16 questions now.`;

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
        parsed.questions = parsed.questions.map((q, i) => {
            let section = Number(q.section);
            if (!section || isNaN(section)) {
                if (i < 8) section = 1;
                else if (i < 10) section = 2;
                else section = 3;
            }
            let category = q.category;
            if (!category) {
                if (section === 1) category = 'mcq';
                else if (section === 2) category = 'coding';
                else if (q.type === 'behavioral') category = 'behavioral';
                else category = 'technical';
            }

            // For coding questions: always override with our bank data (AI may have corrupted them)
            if (section === 2) {
                const bankQ = null; // unused, codingIdx handles it below
                // Detect which slot this is
                const codingIdx = parsed.questions.filter((x, xi) => xi <= i && Number(x.section) === 2).length - 1;
                const src = codingIdx === 0 ? codingQ1 : codingQ2;
                return {
                    id: q.id ?? (i + 1),
                    section,
                    text: src.description,
                    type: 'technical',
                    category: 'coding',
                    options: null,
                    correctAnswer: null,
                    language: 'javascript',
                    explanation: null,
                    functionSignature: src.functionSignature,
                    starterCode: src.starterCode,
                    testCases: src.testCases,
                    title: src.title,
                    difficulty: src.difficulty,
                    constraints: src.constraints || [],
                    examples: src.examples || [],
                };
            }

            return {
                id: q.id ?? (i + 1),
                section,
                text: q.text || 'Question unavailable',
                type: q.type || (category === 'behavioral' ? 'behavioral' : 'technical'),
                category,
                options: Array.isArray(q.options) ? q.options : null,
                correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : null,
                language: q.language || null,
                explanation: q.explanation || null,
                functionSignature: null,
                starterCode: null,
                testCases: null,
                title: null,
                difficulty: null,
                constraints: [],
                examples: [],
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
            const isCoding = a.answer && a.answer.startsWith('[CODE:');
            if (isCoding) {
                passedCoding = true;
                map.push(2);
            } else if (!passedCoding) {
                map.push(1);
            } else {
                map.push(3);
            }
        }
        return map;
    };


    const sectionMap = buildSectionMap(answers);
    console.log('Section map:', sectionMap);
    console.log('Answers count:', answers.length);

    const sectionEarned = { 1: 0, 2: 0, 3: 0 };

    answers.forEach((a, i) => {
        const sec = sectionMap[i] || 3;
        const mpq = SECTION_MARKS[sec]?.perQuestion || 2;

        const isSkipped = !a.answer || a.answer === '[Skipped]';
        if (isSkipped) return;

        if (sec === 1) {
            // MCQ: 2 marks if correct, 0 if wrong
            const q = questions[i];
            if (q && typeof q.correctAnswer === 'number' && Array.isArray(q.options)) {
                const letter = (a.answer || '').charAt(0).toUpperCase();
                const idx = ['A', 'B', 'C', 'D'].indexOf(letter);
                if (idx !== -1 && idx === q.correctAnswer) {
                    sectionEarned[1] += mpq; // full 2 marks for correct
                }
                // wrong answer = 0 marks
            } else {
                // Can't verify — give 1 mark for attempting
                sectionEarned[1] += 1;
            }
        } else if (sec === 2) {
            const raw = a.answer.replace(/^\[CODE:[A-Z]+\][\n\r\s]*/i, '').trim();
            const langMatch = a.answer.match(/^\[CODE:([A-Z]+)\]/i);
            const lang = langMatch ? langMatch[1].toLowerCase() : 'javascript';

            const isGenericStub = !raw || raw.length < 30;
            const isJsStub = lang === 'javascript' && (
                /^\s*function\s+\w+\s*\([^)]*\)\s*\{\s*(\/\/[^\n]*)?\s*\}\s*$/.test(raw) ||
                (/return\s+null;\s*\}/.test(raw) && raw.split('\n').length < 5)
            );
            const isPyStub = lang === 'python' && (
                /^\s*def\s+\w+\s*\([^)]*\)\s*:\s*\n?\s*(pass|\.\.\.)\s*$/.test(raw) ||
                /^\s*def\s+\w+\s*\([^)]*\)\s*:\s*\n\s*#[^\n]*\n\s*pass\s*$/.test(raw)
            );
            const isJavaStub = lang === 'java' && (
                /\/\/\s*your code here/i.test(raw) &&
                !/\b(for|while|if|switch|count\s*[+\-*]|sum\s*[+\-*]|int\s+\w|String\s+\w)\b/.test(raw)
            );
            const isCppStub = lang === 'cpp' && (
                /\/\/\s*your code here/i.test(raw) &&
                !/\b(for|while|if|vector|map)\b/.test(raw)
            );
            const isGoStub = lang === 'go' &&
                /return\s+nil/.test(raw) &&
                !/\b(for|if|range)\b/.test(raw);
            const isPythonNoLogic = lang === 'python' && (() => {
                const lines = raw.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
                const bodyLines = lines.filter(l => !l.startsWith('def '));
                const meaningfulLines = bodyLines.filter(l =>
                    l !== 'pass' && l !== '...' &&
                    !/^return\s+(None|null|0|""|''|\[\]|\{\})$/.test(l)
                );
                return meaningfulLines.length < 2;
            })();

            const isStub = isGenericStub
                || isJsStub
                || (lang === 'python' && (isPyStub || isPythonNoLogic))
                || isJavaStub || isCppStub || isGoStub;

            // For non-executable languages (C++, Java, Go, Rust),
            // award marks only if code is substantial (>100 chars of real logic)
            // and not a stub. For JS/Python we can verify; others get partial credit only.
            const nonExecutable = !['javascript', 'typescript', 'python'].includes(lang);
            const isSubstantial = raw.length > 100 &&
                raw.split('\n').filter(l => l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('#')).length >= 8;

            if (!isStub && (!nonExecutable || isSubstantial)) {
                sectionEarned[2] += mpq;
            }
        } else {
            const len = a.answer.trim().length;
            if (len >= 200) sectionEarned[3] += mpq;
            else if (len >= 80) sectionEarned[3] += Math.round(mpq * 0.5);
            else if (len >= 20) sectionEarned[3] += 1;
        }
    });

    const earnedMarks = sectionEarned[1] + sectionEarned[2] + sectionEarned[3];
    const grandTotal = GRAND_TOTAL_MARKS;
    const overall = Math.round((earnedMarks / grandTotal) * 10 * 10) / 10;
    const s1Score = Math.round((sectionEarned[1] / SECTION_MARKS[1].total) * 10 * 10) / 10;
    const s2Score = Math.round((sectionEarned[2] / SECTION_MARKS[2].total) * 10 * 10) / 10;
    const s3Score = Math.round((sectionEarned[3] / SECTION_MARKS[3].total) * 10 * 10) / 10;
    // ── Step 3: ask AI only for qualitative feedback, not scores ─────────────
    const answeredQA = answers
        .filter(a => a.answer && a.answer !== '[Skipped]')
        .slice(0, 6) // limit tokens
        .map((a, i) => `Q: ${a.question}\nA: ${a.answer.slice(0, 300)}`)
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
            const raw = await callAI(prompt, 900);
            const clean = raw.replace(/```json\n?|```\n?/g, '').trim();
            const ai = JSON.parse(clean.match(/\{[\s\S]*\}/)?.[0] || clean);
            feedback = ai.feedback || [];
            recommendations = ai.recommendations || [];
            summary = ai.summary || '';
            strengths = ai.strengths || [];
            areasToImprove = ai.areasToImprove || [];
        } catch (_) { }
    }

    if (!summary) {
        const skipped = answers.filter(a => !a.answer || a.answer === '[Skipped]').length;
        summary = `Scored ${earnedMarks}/${grandTotal} marks (${overall}/10). ${skipped} of ${answers.length} questions were skipped.`;
    }

    return {
        overall: Math.min(overall, 10),
        relevance: Math.min(s1Score, 10),
        clarity: Math.min(s3Score, 10),
        depth: Math.min(s2Score, 10),
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