"""
app/schemas/question.py
~~~~~~~~~~~~~~~~~~~~~~~
Pydantic v2 schemas for Question read/write.
"""

from pydantic import BaseModel, Field


class QuestionOut(BaseModel):
    """Public-facing representation of a Question (options visible, answer hidden)."""

    id: int
    domain: str
    question_type: str = "theory"
    sub_topic: str
    difficulty: str
    question_text: str
    options: list[str] = Field(..., min_length=4, max_length=4)
    source: str

    model_config = {"from_attributes": True}


class QuestionWithAnswer(BaseModel):
    """Internal schema that includes the correct answer — used in answer key responses."""

    id: int
    domain: str
    question_type: str = "theory"
    sub_topic: str
    difficulty: str
    question_text: str
    options: list[str] = Field(..., min_length=4, max_length=4)
    correct_option_index: int
    explanation: str
    source: str

    model_config = {"from_attributes": True}
