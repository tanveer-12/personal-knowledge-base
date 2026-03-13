-- ==========================================================
-- Personal Knowledge Base Demo Seed Data
--
-- These notes intentionally include semantically similar ideas
-- that DO NOT share keywords. This allows demonstration of
-- semantic search capabilities once embeddings are generated.
--
-- The embedding column is intentionally omitted because
-- embeddings are created by the FastAPI backend using
-- SentenceTransformers during ingestion.
-- ==========================================================

-- ----------------------------------------------------------
-- Productivity / Focus / Habits (5)
-- ----------------------------------------------------------

INSERT INTO notes (title, content, tags)
VALUES (
    'Meetings Drain Me',
    'I feel completely exhausted after sitting through hours of long meetings. By the end of the day my brain
    feels fried and I struggle to focus on anything meaningful',
    'productivity,energy,work'
)

INSERT INTO notes (title, content, tags)
VALUES (
'Video Calls Are Mentally Taxing',
'Back to back video calls leave me mentally drained. Even when I barely speak, the constant attention required makes my energy disappear.',
'focus,work,meetings'
);


INSERT INTO notes (title, content, tags)
VALUES (
'Interruptions Destroy My Flow',
'Whenever I am deeply focused and someone interrupts me, it takes forever to get back into the same mental state. Protecting focus blocks is becoming essential.',
'focus,deep-work,habits'
);

INSERT INTO notes (title, content, tags)
VALUES (
'Unbroken Time Feels Powerful',
'When I spend a few hours working without any distractions, I notice I can produce twice as much output and the work feels more satisfying.',
'productivity,attention,workflow'
);


INSERT INTO notes (title, content, tags)
VALUES (
'Planning My Day The Night Before',
'Writing down what I want to accomplish tomorrow before going to bed helps me start the morning with clarity instead of confusion.',
'habits,planning,routine'
);


-- ----------------------------------------------------------
-- Learning / Books / Studying (4)
-- ----------------------------------------------------------

INSERT INTO notes (title, content, tags)
VALUES (
'Reading Helps Me Relax',
'Reading a few chapters before sleep helps me unwind. It slows down my thoughts and signals to my mind that the day is coming to an end.',
'books,night,routine'
);

INSERT INTO notes (title, content, tags)
VALUES (
'My Nighttime Ritual',
'Before going to bed I like to spend time with a good novel. Turning pages quietly feels like the perfect way to close the day.',
'reading,evening,habit'
);


INSERT INTO notes (title, content, tags)
VALUES (
'Writing Notes Improves Understanding',
'When I study something new I try to rewrite the ideas in my own words. Explaining concepts to myself makes them stick much better.',
'learning,study,notes'
);

INSERT INTO notes (title, content, tags)
VALUES (
'Teaching Myself Out Loud',
'Sometimes I pretend I am explaining a topic to another person. Saying the ideas out loud forces me to organize my thinking clearly.',
'learning,study,thinking'
);


-- ----------------------------------------------------------
-- Technology / Programming (3)
-- ----------------------------------------------------------

INSERT INTO notes (title, content, tags)
VALUES (
'Backend Systems Fascinate Me',
'I enjoy designing server side systems where data flows through APIs and databases. Building the invisible infrastructure behind applications feels satisfying.',
'software,backend,architecture'
);

INSERT INTO notes (title, content, tags)
VALUES (
'Writing Code Feels Like Solving Puzzles',
'Debugging programs often feels like solving a mystery. Each clue in the logs slowly reveals where the logic went wrong.',
'programming,problem-solving,development'
);

INSERT INTO notes (title, content, tags)
VALUES (
'Understanding How Systems Work',
'I like breaking complex applications into smaller pieces to understand how everything interacts. Seeing the big picture makes engineering problems less intimidating.',
'technology,systems,engineering'
);


-- ----------------------------------------------------------
-- Health / Exercise / Wellbeing (3)
-- ----------------------------------------------------------

INSERT INTO notes (title, content, tags)
VALUES (
'Running Clears My Head',
'Going for a run early in the morning lifts my mood. After moving my body for a while the rest of the day feels easier to handle.',
'fitness,morning,mental-health'
);

INSERT INTO notes (title, content, tags)
VALUES (
'Movement Changes My Whole Day',
'When I start the day with physical activity I notice my energy levels stay higher and my mindset becomes more positive.',
'exercise,energy,wellbeing'
);


INSERT INTO notes (title, content, tags)
VALUES (
'Fresh Air Helps My Mind Reset',
'Spending time outside and taking a long walk helps me reset mentally when I feel overwhelmed or stuck.',
'wellbeing,nature,mental-health'
);