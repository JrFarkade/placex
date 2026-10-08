from typing import List, Dict, Any, Optional

class DAGBuilder:
    """
    Role-Specific Learning Roadmap & Prerequisite DAG Builder.
    Constructs personalized learning paths tailored to student's target role, current skills, and skill gaps.
    """

    @classmethod
    def get_prerequisite_roadmap(
        cls,
        target_role: Optional[str] = None,
        mastered_skills: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        role_clean = (target_role or "").lower()
        user_skills = set([s.lower() for s in (mastered_skills or [])])

        # 1. DATA ANALYST ROADMAP
        if "data analyst" in role_clean:
            phases = [
                {
                    "phase": 1,
                    "name": "Applied Statistics & Probability",
                    "duration": "1-2 weeks",
                    "topics": [
                        {"name": "Descriptive Statistics & Variance", "reason": "Fundamental for analyzing data distributions."},
                        {"name": "Probability & Bayes Theorem", "reason": "Required for predictive modeling and risk assessment."},
                        {"name": "Hypothesis Testing & A/B Testing", "reason": "Crucial for business metrics and product experiments."},
                        {"name": "Correlation & Regression Analysis", "reason": "Used to discover relationships between business variables."}
                    ]
                },
                {
                    "phase": 2,
                    "name": "Advanced SQL & Database Querying",
                    "duration": "1 week",
                    "topics": [
                        {"name": "SELECT, WHERE, GROUP BY & HAVING", "reason": "Basic data retrieval and aggregations."},
                        {"name": "INNER, LEFT, RIGHT & FULL JOINs", "reason": "Combining relational data tables."},
                        {"name": "Subqueries & Common Table Expressions (CTEs)", "reason": "Structuring complex analytical queries."},
                        {"name": "Window Functions (RANK, DENSE_RANK, LEAD, LAG)", "reason": "Advanced trend and cohort analysis."}
                    ]
                },
                {
                    "phase": 3,
                    "name": "Data Cleaning & Wrangling with Python",
                    "duration": "2 weeks",
                    "topics": [
                        {"name": "Python Data Types & Control Structures", "reason": "Basic scripting for data manipulation."},
                        {"name": "Pandas DataFrames & Series", "reason": "Industry standard data manipulation library."},
                        {"name": "Handling Missing Values & Outliers", "reason": "Essential for high-quality analysis."},
                        {"name": "NumPy Array Operations", "reason": "Fast numerical calculations."}
                    ]
                },
                {
                    "phase": 4,
                    "name": "Data Visualization & Business Intelligence",
                    "duration": "1 week",
                    "topics": [
                        {"name": "Power BI / Tableau Interactive Dashboards", "reason": "Visualizing insights for executive stakeholders."},
                        {"name": "Matplotlib & Seaborn Charting", "reason": "Exploratory data analysis in Python."},
                        {"name": "KPI Metrics & Dashboard Storytelling", "reason": "Communicating findings clearly."}
                    ]
                },
                {
                    "phase": 5,
                    "name": "Business Analytics & Case Studies",
                    "duration": "2 weeks",
                    "topics": [
                        {"name": "Customer Churn & Retention Analysis", "reason": "Real-world business analytics problem."},
                        {"name": "Sales & Revenue Trend Forecasting", "reason": "Financial and operational analytics."},
                        {"name": "E-Commerce Funnel Optimization Project", "reason": "Portfolio-worthy analytics case study."}
                    ]
                },
                {
                    "phase": 6,
                    "name": "Placement Prep & Technical Analytics Interviews",
                    "duration": "1 week",
                    "topics": [
                        {"name": "ATS Resume Alignment for Data Analyst", "reason": "Ensures native ATS benchmark 80+ score."},
                        {"name": "SQL Live Coding & Case Question Practice", "reason": "Prepares for technical screening rounds."},
                        {"name": "Behavioral STAR & Portfolio Walkthrough", "reason": "Prepares for final interview rounds."}
                    ]
                }
            ]

        # 2. PRODUCT ANALYST ROADMAP
        elif "product analyst" in role_clean:
            phases = [
                {
                    "phase": 1,
                    "name": "SQL & Relational Databases",
                    "duration": "1 week",
                    "topics": [
                        {"name": "Relational Schemas & SQL Aggregations", "reason": "Querying user activity data."},
                        {"name": "JOINs & Complex CTEs", "reason": "Analyzing cross-table product events."}
                    ]
                },
                {
                    "phase": 2,
                    "name": "Product Metrics & KPI Frameworks",
                    "duration": "1 week",
                    "topics": [
                        {"name": "DAU, MAU, Retention & Churn Rates", "reason": "Core product growth indicators."},
                        {"name": "Funnel Conversion & LTV Analysis", "reason": "User acquisition & monetization metrics."}
                    ]
                },
                {
                    "phase": 3,
                    "name": "Applied Statistics & A/B Testing",
                    "duration": "2 weeks",
                    "topics": [
                        {"name": "Sample Size Calculation & Power", "reason": "Designing statistically sound product experiments."},
                        {"name": "P-Values & Confidence Intervals", "reason": "Evaluating test significance."}
                    ]
                },
                {
                    "phase": 4,
                    "name": "Product Analytics & Portfolio Build",
                    "duration": "2 weeks",
                    "topics": [
                        {"name": "Mixpanel & Amplitude Tracking", "reason": "Modern product analytics tools."},
                        {"name": "Product Feature Adoption Project", "reason": "Portfolio-ready case study."}
                    ]
                }
            ]

        # 3. MACHINE LEARNING ENGINEER ROADMAP
        elif "machine learning" in role_clean or "ml engineer" in role_clean:
            phases = [
                {
                    "phase": 1,
                    "name": "Python, Math & Linear Algebra",
                    "duration": "2 weeks",
                    "topics": [
                        {"name": "Matrix Multiplication & Vectors", "reason": "Mathematics underlying neural networks."},
                        {"name": "Multivariable Calculus & Gradients", "reason": "Understanding optimization algorithms."}
                    ]
                },
                {
                    "phase": 2,
                    "name": "Core Machine Learning Algorithms",
                    "duration": "2 weeks",
                    "topics": [
                        {"name": "Linear & Logistic Regression", "reason": "Baseline supervised learning models."},
                        {"name": "Decision Trees, Random Forests & XGBoost", "reason": "Top performing tabular data algorithms."}
                    ]
                },
                {
                    "phase": 3,
                    "name": "Deep Learning & MLOps Deployment",
                    "duration": "3 weeks",
                    "topics": [
                        {"name": "PyTorch Neural Network Training", "reason": "Modern deep learning framework."},
                        {"name": "Model Dockerization & FastAPI Serving", "reason": "Production ML deployment."}
                    ]
                }
            ]

        # 4. SOFTWARE DEVELOPMENT ENGINEER (SDE) ROADMAP (DEFAULT FOR SOFTWARE ROLES)
        else:
            phases = [
                {
                    "phase": 1,
                    "name": "Programming Fundamentals & Clean Code",
                    "duration": "1 week",
                    "topics": [
                        {"name": "Variables, Loops & Control Flow", "reason": "Core programming building blocks."},
                        {"name": "Functions & Modular Design", "reason": "Writing readable, reusable code."},
                        {"name": "Object-Oriented Programming (OOP)", "reason": "Encapsulation, Inheritance & Polymorphism."}
                    ]
                },
                {
                    "phase": 2,
                    "name": "Data Structures & Algorithms (DSA)",
                    "duration": "3 weeks",
                    "topics": [
                        {"name": "Arrays & String Manipulation", "reason": "Most common coding interview questions."},
                        {"name": "Linked Lists, Stacks & Queues", "reason": "Linear memory structures."},
                        {"name": "Trees & Binary Search Trees", "reason": "Hierarchical data representation."},
                        {"name": "Graphs & BFS/DFS Traversal", "reason": "Network & connectivity algorithms."}
                    ]
                },
                {
                    "phase": 3,
                    "name": "Algorithm Paradigms & Dynamic Programming",
                    "duration": "2 weeks",
                    "topics": [
                        {"name": "Two-Pointers & Sliding Window", "reason": "Optimizing search efficiency."},
                        {"name": "Memoization & Dynamic Programming", "reason": "Solving complex recursive subproblems."}
                    ]
                },
                {
                    "phase": 4,
                    "name": "System Design & Architecture",
                    "duration": "2 weeks",
                    "topics": [
                        {"name": "RESTful API Design & Relational SQL", "reason": "Backend microservices architecture."},
                        {"name": "Caching (Redis) & Load Balancing", "reason": "Building scalable web infrastructure."}
                    ]
                },
                {
                    "phase": 5,
                    "name": "Placement Interview & Portfolio Preparation",
                    "duration": "1 week",
                    "topics": [
                        {"name": "Full-Stack Project Build", "reason": "Portfolio demonstration."},
                        {"name": "ATS Resume Polish & Coding Sandbox", "reason": "Technical interview readiness."}
                    ]
                }
            ]

        # 5. MASTERED SKILL FILTERING (DO NOT FORCE RE-LEARNING)
        processed_phases = []
        for phase in phases:
            topic_objs = []
            phase_completed_count = 0

            for top in phase["topics"]:
                top_name = top["name"]
                # Check if student already mastered this skill
                is_mastered = any(s in top_name.lower() for s in user_skills if len(s) > 2)
                
                status = "Completed" if is_mastered else "Pending"
                if is_mastered:
                    phase_completed_count += 1

                topic_objs.append({
                    "name": top_name,
                    "reason": top["reason"],
                    "status": status
                })

            phase_status = "Completed" if phase_completed_count == len(topic_objs) else ("In Progress" if phase_completed_count > 0 else "Upcoming")

            processed_phases.append({
                "phase": phase["phase"],
                "name": phase["name"],
                "duration": phase["duration"],
                "status": phase_status,
                "topics": topic_objs
            })

        return processed_phases
