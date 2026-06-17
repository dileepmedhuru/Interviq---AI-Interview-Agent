ROLES = [
    'Software Engineer', 'Product Manager', 'Data Scientist',
    'UX Designer', 'DevOps Engineer', 'ML Engineer',
    'Backend Engineer', 'Frontend Engineer', 'Full Stack Engineer', 'Data Analyst',
]
EXP_LEVELS = ['entry', 'mid', 'senior', 'lead']
MAX_QUESTIONS = 8
MIN_QUESTIONS = 3
UPLOAD_MAX_SIZE = 5 * 1024 * 1024
ALLOWED_FILE_TYPES = ['application/pdf', 'text/plain']
SALT_ROUNDS = 12
QUESTION_TYPES = ['behavioral', 'technical', 'situational']

# Marks per question per section
SECTION_MARKS = {
    1: {"perQuestion": 2,  "total": 16},  # 8 MCQ × 2 = 16
    2: {"perQuestion": 10, "total": 20},  # 2 coding × 10 = 20
    3: {"perQuestion": 4,  "total": 24},  # 6 video × 4 = 24
}
GRAND_TOTAL_MARKS = 60  # 16 + 20 + 24
