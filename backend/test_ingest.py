from app.services.notes_service import ingest_note

result = ingest_note("This is a test note about machine learning and neural networks.")

print(result)
print(len(result.chunks[0].embedding))