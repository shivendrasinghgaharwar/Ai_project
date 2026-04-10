"""
Synthetic Dataset Generator
============================
Generates realistic course, user, and interaction data for the
Personalized Learning Recommender System.

Produces:
  - courses.csv  (~100 courses)
  - users.csv    (~500 users)
  - interactions.csv (~5000 user-course interactions)
"""

import os
import sys
import random
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# ── allow imports from parent ──────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import (
    NUM_COURSES, NUM_USERS, NUM_INTERACTIONS,
    DATA_DIR, CATEGORIES, DIFFICULTY_LEVELS,
)

# ─── Seed for reproducibility ───────────────────────────────────────────────
SEED = 42
random.seed(SEED)
np.random.seed(SEED)

# ─── Rich metadata pools ────────────────────────────────────────────────────

COURSE_TEMPLATES = {
    "Python Programming": [
        ("Python Fundamentals", "Master the basics of Python programming including variables, data types, control flow, functions, and object-oriented programming. Build real-world projects from scratch."),
        ("Advanced Python Patterns", "Deep dive into Python design patterns, decorators, generators, context managers, metaclasses, and concurrency with asyncio."),
        ("Python for Automation", "Learn to automate repetitive tasks using Python scripts, file handling, web scraping with BeautifulSoup, and task scheduling."),
        ("Python Data Structures", "Comprehensive guide to lists, dictionaries, sets, tuples, stacks, queues, linked lists, trees, and graphs in Python."),
        ("Python Testing Masterclass", "Write robust code with pytest, unittest, mocking, test-driven development, and continuous integration pipelines."),
        ("Python API Development", "Build RESTful APIs from scratch using Flask and FastAPI, including authentication, database integration, and deployment."),
        ("Python GUI Applications", "Create desktop applications using Tkinter, PyQt5, and Kivy with event-driven programming and modern UI design."),
        ("Python Scripting for SysAdmins", "System administration automation with Python: managing servers, parsing logs, monitoring resources, and network scripting."),
        ("Pythonic Code Workshop", "Write clean, idiomatic Python: list comprehensions, walrus operator, type hints, f-strings, and PEP 8 best practices."),
        ("Python Packaging and Distribution", "Learn to structure, package, and distribute Python libraries using setuptools, poetry, and PyPI publishing."),
    ],
    "Data Science": [
        ("Data Science with Python", "End-to-end data science workflow: data collection, cleaning, exploratory data analysis, visualization with matplotlib and seaborn, and storytelling with data."),
        ("Statistical Analysis Fundamentals", "Probability theory, hypothesis testing, confidence intervals, ANOVA, regression analysis, and Bayesian statistics for data-driven decisions."),
        ("Data Visualization Mastery", "Create stunning charts and dashboards using matplotlib, seaborn, plotly, and Tableau. Master the art of visual storytelling."),
        ("Pandas for Data Analysis", "Master pandas DataFrames: indexing, merging, groupby, pivot tables, time series operations, and performance optimization."),
        ("Exploratory Data Analysis", "Techniques for understanding datasets: distribution analysis, outlier detection, correlation matrices, feature relationships, and pattern discovery."),
        ("Big Data Analytics", "Process massive datasets using PySpark, Dask, and distributed computing frameworks for scalable data analysis."),
        ("Data Wrangling Bootcamp", "Transform messy real-world data into clean, analysis-ready datasets using advanced pandas, regex, and ETL pipelines."),
        ("Time Series Analysis", "Forecast trends using ARIMA, Prophet, exponential smoothing, and deep learning for sequential data patterns."),
        ("A/B Testing for Business", "Design and analyze experiments, calculate sample sizes, interpret p-values, and make data-driven product decisions."),
        ("SQL for Data Scientists", "Advanced SQL queries, window functions, CTEs, query optimization, and integrating SQL with Python analytics workflows."),
    ],
    "Machine Learning": [
        ("Machine Learning Fundamentals", "Core ML concepts: supervised and unsupervised learning, regression, classification, clustering, model evaluation, and cross-validation."),
        ("Deep Learning with TensorFlow", "Build neural networks from scratch: CNNs, RNNs, transformers, transfer learning, and model deployment with TensorFlow and Keras."),
        ("Natural Language Processing", "Text analysis pipeline: tokenization, word embeddings, sentiment analysis, named entity recognition, and text generation with transformers."),
        ("Computer Vision Essentials", "Image classification, object detection, image segmentation, GANs, and real-time vision applications using OpenCV and PyTorch."),
        ("Recommender Systems", "Build recommendation engines using collaborative filtering, content-based filtering, matrix factorization, and hybrid approaches."),
        ("Feature Engineering Mastery", "Transform raw data into powerful features: encoding, scaling, feature selection, dimensionality reduction, and domain-specific techniques."),
        ("ML Model Deployment", "Production-ready ML: model serialization, Docker containers, REST APIs, monitoring, A/B testing, and MLOps best practices."),
        ("Ensemble Methods", "Boost prediction accuracy with random forests, gradient boosting, XGBoost, LightGBM, stacking, and blending techniques."),
        ("Reinforcement Learning", "Train agents to make decisions: Q-learning, policy gradients, deep Q-networks, and applications in robotics and gaming."),
        ("AutoML and Hyperparameter Tuning", "Automated machine learning pipelines, grid search, random search, Bayesian optimization, and neural architecture search."),
    ],
    "Web Development": [
        ("Full-Stack Web Development", "Build complete web applications from frontend to backend: HTML5, CSS3, JavaScript, React, Node.js, and database integration."),
        ("React.js Masterclass", "Modern React development: hooks, context API, Redux, server-side rendering, and building performant single-page applications."),
        ("Backend Development with Node.js", "Server-side JavaScript: Express.js, REST APIs, GraphQL, authentication, middleware, and database connectivity."),
        ("CSS and Modern Layouts", "Advanced CSS: Flexbox, Grid, animations, custom properties, responsive design, and CSS architecture methodologies."),
        ("JavaScript ES6+ Deep Dive", "Modern JavaScript features: arrow functions, destructuring, promises, async/await, modules, proxies, and iterators."),
        ("Django Web Framework", "Rapid web development with Django: ORM, templates, forms, authentication, admin panel, and REST framework."),
        ("Progressive Web Apps", "Build offline-capable web apps: service workers, push notifications, app manifests, and performance optimization strategies."),
        ("TypeScript for Professionals", "Type-safe JavaScript development: interfaces, generics, decorators, utility types, and migrating existing JavaScript projects."),
        ("Web Performance Optimization", "Speed up websites: lazy loading, code splitting, caching strategies, CDN setup, and Core Web Vitals optimization."),
        ("GraphQL API Design", "Design and implement GraphQL APIs: schemas, resolvers, mutations, subscriptions, and client-side integration with Apollo."),
    ],
    "Cloud Computing": [
        ("AWS Cloud Practitioner", "Amazon Web Services fundamentals: EC2, S3, Lambda, RDS, IAM, VPC, and cloud architecture best practices."),
        ("Google Cloud Platform Essentials", "GCP core services: Compute Engine, Cloud Storage, BigQuery, Cloud Functions, and Kubernetes Engine."),
        ("Microsoft Azure Fundamentals", "Azure cloud services: Virtual Machines, Blob Storage, Azure Functions, Cosmos DB, and Active Directory."),
        ("Cloud Architecture Design", "Design scalable, resilient cloud solutions: microservices patterns, load balancing, auto-scaling, and disaster recovery."),
        ("Serverless Computing", "Build applications without managing servers: AWS Lambda, Azure Functions, Google Cloud Functions, and serverless frameworks."),
        ("Multi-Cloud Strategy", "Deploy across multiple cloud providers: portability, vendor lock-in avoidance, Terraform, and multi-cloud networking."),
        ("Cloud Cost Optimization", "Reduce cloud spending: right-sizing instances, reserved capacity planning, spot instances, and cost monitoring tools."),
        ("Cloud Migration Strategies", "Migrate on-premises workloads to cloud: assessment, planning, lift-and-shift, re-platforming, and re-architecting."),
        ("Kubernetes in Production", "Container orchestration mastery: deployments, services, ingress, helm charts, monitoring, and security hardening."),
        ("Cloud Security Fundamentals", "Secure cloud environments: identity management, encryption, compliance frameworks, and security monitoring."),
    ],
    "DevOps": [
        ("DevOps Engineering", "CI/CD pipelines, infrastructure as code, containerization, monitoring, and DevOps culture transformation."),
        ("Docker Containerization", "Container fundamentals: Dockerfiles, images, volumes, networking, Docker Compose, and multi-stage builds."),
        ("CI/CD with GitHub Actions", "Automate software delivery: workflow files, testing pipelines, deployment automation, and release management."),
        ("Infrastructure as Code", "Manage infrastructure with Terraform, CloudFormation, and Pulumi: state management, modules, and best practices."),
        ("Monitoring and Observability", "System health tracking with Prometheus, Grafana, ELK stack, distributed tracing, and alerting strategies."),
        ("Linux System Administration", "Essential Linux skills: command line, shell scripting, user management, networking, and performance tuning."),
        ("GitOps Workflow", "Declarative infrastructure management with Git: ArgoCD, Flux, pull-based deployments, and reconciliation loops."),
        ("Site Reliability Engineering", "SRE practices: SLOs, error budgets, incident management, chaos engineering, and toil reduction."),
        ("Ansible Automation", "Configuration management and automation: playbooks, roles, inventories, vault, and integration with CI/CD."),
        ("Jenkins Pipeline Mastery", "Build robust CI/CD pipelines: Jenkinsfiles, shared libraries, parallel stages, and plugin ecosystem."),
    ],
    "Databases": [
        ("SQL Database Design", "Relational database fundamentals: normalization, ER diagrams, indexing, transactions, and query optimization."),
        ("MongoDB Essentials", "NoSQL document database: CRUD operations, aggregation framework, indexing, replication, and schema design patterns."),
        ("PostgreSQL Advanced Features", "Leverage PostgreSQL power: JSON operations, full-text search, partitioning, extensions, and performance tuning."),
        ("Redis for Caching", "In-memory data store: data structures, caching patterns, pub/sub messaging, streams, and cluster configuration."),
        ("Database Performance Tuning", "Optimize query performance: execution plans, indexing strategies, query rewriting, and connection pooling."),
        ("Graph Databases with Neo4j", "Model connected data: Cypher query language, graph algorithms, recommendations, and knowledge graph construction."),
        ("Data Modeling Best Practices", "Design effective database schemas: entity relationships, denormalization trade-offs, and migration strategies."),
        ("Elasticsearch Deep Dive", "Full-text search engine: indexing, analyzers, aggregations, geo-queries, and observability use cases."),
        ("Database Migration Strategies", "Safely evolve database schemas: version control, zero-downtime migrations, rollback plans, and data transformation."),
        ("Distributed Databases", "Understand CAP theorem, eventual consistency, sharding, replication, and databases like CockroachDB and Cassandra."),
    ],
    "Artificial Intelligence": [
        ("Introduction to AI", "Artificial intelligence foundations: search algorithms, knowledge representation, reasoning, planning, and ethical considerations."),
        ("Generative AI Fundamentals", "Understanding large language models, prompt engineering, fine-tuning, RAG architectures, and responsible AI usage."),
        ("AI Ethics and Governance", "Bias detection, fairness metrics, explainable AI, regulatory compliance, and responsible AI development frameworks."),
        ("Conversational AI", "Build chatbots and virtual assistants: intent recognition, dialogue management, and integration with messaging platforms."),
        ("AI for Healthcare", "Medical image analysis, drug discovery, clinical NLP, patient outcome prediction, and healthcare AI regulations."),
        ("AI in Finance", "Algorithmic trading, fraud detection, credit scoring, risk assessment, and regulatory technology applications."),
        ("Knowledge Graphs", "Build and query knowledge graphs: ontology design, entity resolution, graph embeddings, and reasoning over graphs."),
        ("Edge AI and IoT", "Deploy AI models on edge devices: model compression, TensorFlow Lite, ONNX Runtime, and real-time inference."),
        ("AI Project Management", "Lead AI projects: problem framing, data strategy, team structure, model lifecycle, and stakeholder communication."),
        ("Prompt Engineering Mastery", "Craft effective prompts for LLMs: chain-of-thought reasoning, few-shot learning, system prompts, and evaluation."),
    ],
    "Cybersecurity": [
        ("Cybersecurity Fundamentals", "Security principles: CIA triad, threat modeling, risk assessment, security controls, and incident response planning."),
        ("Ethical Hacking", "Penetration testing methodology: reconnaissance, scanning, exploitation, post-exploitation, and report writing."),
        ("Network Security", "Secure network infrastructure: firewalls, IDS/IPS, VPNs, network segmentation, and traffic analysis."),
        ("Web Application Security", "OWASP Top 10 vulnerabilities: XSS, SQL injection, CSRF, authentication flaws, and secure coding practices."),
        ("Security Operations Center", "SOC operations: SIEM tools, log analysis, threat hunting, incident response, and forensic investigation."),
        ("Cryptography Essentials", "Encryption algorithms, digital signatures, PKI, certificate management, and cryptographic protocol design."),
        ("Cloud Security Architecture", "Secure cloud deployments: identity federation, data encryption, network security groups, and compliance automation."),
        ("Malware Analysis", "Reverse engineering malware: static analysis, dynamic analysis, sandboxing, and threat intelligence integration."),
        ("Security Compliance", "Regulatory frameworks: GDPR, HIPAA, PCI-DSS, SOC 2, and building compliance programs."),
        ("Zero Trust Security", "Implement zero trust architecture: identity verification, micro-segmentation, least privilege, and continuous monitoring."),
    ],
    "Mobile Development": [
        ("Android App Development", "Build Android apps with Kotlin: activities, fragments, Jetpack Compose, Room database, and Material Design 3."),
        ("iOS App Development", "Create iOS apps with Swift: SwiftUI, UIKit, Core Data, networking, and App Store submission process."),
        ("React Native Cross-Platform", "Build mobile apps for iOS and Android: components, navigation, state management, and native module integration."),
        ("Flutter Development", "Cross-platform mobile development with Dart: widgets, state management, animations, and platform channel communication."),
        ("Mobile UI/UX Design", "Design mobile interfaces: layout patterns, touch targets, accessibility, animation principles, and design systems."),
        ("Mobile App Testing", "Quality assurance for mobile: unit testing, integration testing, UI automation, performance testing, and crash reporting."),
        ("Mobile Backend Services", "Backend-as-a-Service: Firebase, Supabase, push notifications, analytics, and real-time synchronization."),
        ("Mobile App Performance", "Optimize mobile apps: memory management, battery efficiency, network optimization, and rendering performance."),
        ("Mobile Security", "Secure mobile applications: data storage encryption, secure communication, authentication, and code obfuscation."),
        ("App Store Optimization", "Improve app visibility: keyword research, listing optimization, A/B testing, ratings management, and growth strategies."),
    ],
}

TAGS_BY_CATEGORY = {
    "Python Programming": ["python", "scripting", "automation", "oop", "programming", "backend"],
    "Data Science": ["data-science", "analytics", "statistics", "visualization", "pandas", "numpy"],
    "Machine Learning": ["machine-learning", "deep-learning", "neural-networks", "ai", "tensorflow", "pytorch"],
    "Web Development": ["web", "frontend", "backend", "javascript", "html", "css", "react", "nodejs"],
    "Cloud Computing": ["cloud", "aws", "gcp", "azure", "serverless", "infrastructure"],
    "DevOps": ["devops", "ci-cd", "docker", "kubernetes", "automation", "linux"],
    "Databases": ["database", "sql", "nosql", "data-modeling", "performance", "postgresql"],
    "Artificial Intelligence": ["ai", "nlp", "generative-ai", "llm", "ethics", "chatbot"],
    "Cybersecurity": ["security", "hacking", "encryption", "network-security", "compliance", "pentesting"],
    "Mobile Development": ["mobile", "android", "ios", "react-native", "flutter", "app-development"],
}

INSTRUCTOR_NAMES = [
    "Dr. Sarah Chen", "Prof. James Miller", "Alex Rodriguez", "Dr. Priya Sharma",
    "Michael O'Brien", "Dr. Lisa Wang", "David Kim", "Prof. Emily Turner",
    "Raj Patel", "Dr. Maria Garcia", "Chris Johnson", "Prof. Aisha Mohammed",
    "Dr. Robert Lee", "Sophia Martinez", "Dr. Thomas Brown", "Nina Kowalski",
    "Dr. Kevin Zhang", "Prof. Rachel Green", "Dr. Ahmed Hassan", "Laura Wilson",
]

FIRST_NAMES = [
    "Aarav", "Sophia", "Liam", "Olivia", "Noah", "Emma", "Ethan", "Ava",
    "Lucas", "Mia", "Mason", "Isabella", "Logan", "Charlotte", "James", "Amelia",
    "Aiden", "Harper", "Elijah", "Evelyn", "Arjun", "Mei", "Yuki", "Carlos",
    "Fatima", "Wei", "Ananya", "Dmitri", "Zara", "Kenji", "Priya", "Oscar",
    "Leila", "Hiroshi", "Aaliyah", "Chen", "Rosa", "Vikram", "Isla", "Jun",
    "Sana", "Erik", "Nadia", "Tariq", "Clara", "Ravi", "Elena", "Boris",
    "Yara", "Leo", "Nina", "Felix", "Jade", "Marco", "Anika", "Sven",
    "Zoya", "Kai", "Dina", "Axel", "Hana", "Ivan", "Lena", "Omar",
]

LAST_NAMES = [
    "Patel", "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia",
    "Miller", "Davis", "Rodriguez", "Martinez", "Anderson", "Taylor", "Thomas",
    "Hernandez", "Moore", "Martin", "Jackson", "Thompson", "White", "Lee",
    "Harris", "Clark", "Lewis", "Robinson", "Walker", "Young", "Kim",
    "Wright", "Lopez", "Hill", "Scott", "Green", "Adams", "Baker",
    "Gonzalez", "Nelson", "Carter", "Mitchell", "Perez", "Roberts", "Turner",
    "Phillips", "Campbell", "Parker", "Evans", "Edwards", "Collins", "Stewart",
    "Sanchez", "Morris", "Rogers", "Reed", "Cook", "Morgan", "Bell",
    "Murphy", "Bailey", "Rivera", "Cooper", "Richardson", "Cox", "Howard",
]


def generate_courses():
    """Generate realistic course catalog."""
    courses = []
    course_id = 1

    for category, templates in COURSE_TEMPLATES.items():
        tags_pool = TAGS_BY_CATEGORY[category]
        for title, description in templates:
            difficulty = random.choice(DIFFICULTY_LEVELS)
            duration = round(random.uniform(2.0, 80.0), 1)
            instructor = random.choice(INSTRUCTOR_NAMES)
            # Select 2-4 tags from category + some cross-category tags
            num_tags = random.randint(2, 4)
            tags = random.sample(tags_pool, min(num_tags, len(tags_pool)))
            rating_avg = round(np.clip(np.random.normal(4.0, 0.6), 2.5, 5.0), 1)

            courses.append({
                "course_id": f"C{course_id:03d}",
                "title": title,
                "description": description,
                "category": category,
                "difficulty": difficulty,
                "tags": ", ".join(tags),
                "duration_hours": duration,
                "instructor": instructor,
                "rating_avg": rating_avg,
            })
            course_id += 1

    return pd.DataFrame(courses)


def generate_users(num_users, categories):
    """Generate realistic user profiles."""
    users = []
    base_date = datetime(2024, 1, 1)

    for i in range(1, num_users + 1):
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        name = f"{first} {last}"

        # Each user interested in 1-4 categories
        num_interests = random.randint(1, 4)
        interests = random.sample(categories, num_interests)
        experience = random.choice(DIFFICULTY_LEVELS)
        signup_date = base_date + timedelta(days=random.randint(0, 500))

        users.append({
            "user_id": f"U{i:04d}",
            "name": name,
            "interests": ", ".join(interests),
            "experience_level": experience,
            "signup_date": signup_date.strftime("%Y-%m-%d"),
        })

    return pd.DataFrame(users)


def generate_interactions(users_df, courses_df, num_interactions):
    """
    Generate realistic user-course interactions.
    Uses power-law distribution for course popularity and
    interest-aligned selection for realistic patterns.
    """
    interactions = []
    user_ids = users_df["user_id"].tolist()
    course_ids = courses_df["course_id"].tolist()
    course_categories = dict(zip(courses_df["course_id"], courses_df["category"]))
    user_interests = dict(zip(
        users_df["user_id"],
        users_df["interests"].apply(lambda x: [i.strip() for i in x.split(",")])
    ))

    # Power-law: some courses are much more popular
    popularity = np.random.pareto(a=1.5, size=len(course_ids))
    popularity = popularity / popularity.sum()

    seen_pairs = set()
    base_date = datetime(2024, 6, 1)

    attempts = 0
    while len(interactions) < num_interactions and attempts < num_interactions * 5:
        attempts += 1
        user_id = random.choice(user_ids)

        # 70% chance: pick a course from user's interest areas
        if random.random() < 0.7:
            interests = user_interests[user_id]
            matching_courses = [
                cid for cid in course_ids
                if course_categories[cid] in interests
            ]
            if matching_courses:
                course_id = random.choice(matching_courses)
            else:
                course_id = np.random.choice(course_ids, p=popularity)
        else:
            course_id = np.random.choice(course_ids, p=popularity)

        pair = (user_id, course_id)
        if pair in seen_pairs:
            continue
        seen_pairs.add(pair)

        # Higher ratings for interest-aligned courses
        is_aligned = course_categories[course_id] in user_interests[user_id]
        if is_aligned:
            rating = int(np.clip(np.random.normal(4.2, 0.8), 1, 5))
        else:
            rating = int(np.clip(np.random.normal(3.2, 1.0), 1, 5))

        # Progress depends on rating
        if rating >= 4:
            progress = int(np.clip(np.random.normal(80, 15), 10, 100))
        elif rating >= 3:
            progress = int(np.clip(np.random.normal(55, 20), 5, 100))
        else:
            progress = int(np.clip(np.random.normal(25, 15), 5, 60))

        completed = progress >= 90
        timestamp = base_date + timedelta(
            days=random.randint(0, 300),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59),
        )

        interactions.append({
            "user_id": user_id,
            "course_id": course_id,
            "rating": rating,
            "progress": progress,
            "completed": completed,
            "timestamp": timestamp.strftime("%Y-%m-%d %H:%M:%S"),
        })

    return pd.DataFrame(interactions)


def main():
    """Generate all datasets and save to CSV."""
    os.makedirs(DATA_DIR, exist_ok=True)

    print("=" * 60)
    print("  SYNTHETIC DATASET GENERATOR")
    print("  Personalized Learning Recommender System")
    print("=" * 60)

    # Generate courses
    print(f"\n📚 Generating {NUM_COURSES} courses...")
    courses_df = generate_courses()
    courses_path = os.path.join(DATA_DIR, "courses.csv")
    courses_df.to_csv(courses_path, index=False)
    print(f"   ✅ Saved {len(courses_df)} courses → {courses_path}")
    print(f"   📂 Categories: {courses_df['category'].nunique()}")
    print(f"   📊 Avg rating: {courses_df['rating_avg'].mean():.2f}")

    # Generate users
    print(f"\n👥 Generating {NUM_USERS} users...")
    users_df = generate_users(NUM_USERS, CATEGORIES)
    users_path = os.path.join(DATA_DIR, "users.csv")
    users_df.to_csv(users_path, index=False)
    print(f"   ✅ Saved {len(users_df)} users → {users_path}")
    print(f"   🎯 Experience levels: {dict(users_df['experience_level'].value_counts())}")

    # Generate interactions
    print(f"\n🔗 Generating {NUM_INTERACTIONS} interactions...")
    interactions_df = generate_interactions(users_df, courses_df, NUM_INTERACTIONS)
    interactions_path = os.path.join(DATA_DIR, "interactions.csv")
    interactions_df.to_csv(interactions_path, index=False)
    print(f"   ✅ Saved {len(interactions_df)} interactions → {interactions_path}")
    print(f"   ⭐ Rating distribution:")
    for rating, count in sorted(interactions_df["rating"].value_counts().items()):
        bar = "█" * (count // 50)
        print(f"      {rating}★ : {count:>5} {bar}")
    print(f"   📈 Avg progress: {interactions_df['progress'].mean():.1f}%")
    print(f"   ✅ Completion rate: {interactions_df['completed'].mean() * 100:.1f}%")

    print("\n" + "=" * 60)
    print("  ✅ ALL DATASETS GENERATED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    main()
