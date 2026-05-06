# LMS Event Contracts

```json
{
  "id": "evt_01",
  "type": "course.enrollment.created",
  "occurredAt": "2026-05-07T00:00:00.000Z",
  "actorId": "user_123",
  "data": {
    "courseId": "course_123",
    "userId": "user_456",
    "cohortId": "cohort_789"
  }
}
```

Core event types:

- `auth.user.registered`
- `course.published`
- `course.enrollment.created`
- `lesson.progress.updated`
- `quiz.attempt.submitted`
- `assignment.submitted`
- `assignment.reviewed`
- `certificate.issued`
- `payment.paid`
- `notification.sent`

