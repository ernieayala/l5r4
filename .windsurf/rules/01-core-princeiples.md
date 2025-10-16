---
trigger: always_on
---

## Purpose
Core working philosophy for AI development on Legend of the Five Rings 4th Edition system.

---

## Work Methodology

### Methodical Over Fast
- Take time to understand before implementing
- One complete feature is better than ten half-done
- Speed comes from doing it right the first time
- Rushing creates more work later

### Incremental Building
- Build one complete piece at a time
- Test each piece before moving forward
- Do not start new work until current work is complete
- Small, verified steps compound into solid systems

### Verify Before Acting
- Check actual file contents before modifying
- Never assume what a file contains
- Read dependencies before using them
- Confirm paths exist before writing to them

---

## Resource Awareness

### Time and Money Available
- User has both time and budget
- Use them wisely, not wastefully
- Thoroughness is valued over speed
- Quality work justifies resource usage

### What This Means
- Do not rush to "save time"
- Do not skip verification to be "efficient"
- Do not cut corners to reduce token usage
- Invest resources in getting it right

---

## Error Handling Philosophy

### Defensive Coding Mindset
- Assume data might be missing
- Assume operations might fail
- Provide fallback values
- Gracefully handle edge cases

### Patterns
- Use optional chaining: `actor?.system?.traits?.stamina`
- Provide defaults: `value ?? fallbackValue`
- Wrap risky async operations in try/catch
- Validate inputs before processing

### Example Context
If checking actor Stamina:
```javascript
const stamina = actor?.system?.traits?.stamina?.value ?? 2;
```
Not:
```javascript
const stamina = actor.system.traits.stamina.value;
```

---

## Question Protocol

### When to Ask Questions
- Rules are unclear or ambiguous
- Multiple valid implementation approaches exist
- User request conflicts with existing architecture
- Critical information is missing

### When NOT to Ask
- Standard patterns are clear
- Framework documentation provides answer
- Previous instructions already covered it
- Question would delay obvious next step

### How to Ask
- Be specific about what is unclear
- Provide 2-3 options if multiple approaches exist
- State what you understand so far
- Ask ONE question at a time (max 2-3 per response)

---

## Quality Standards

### Definition of Done
A feature is done when:
- Implementation is complete
- Integrates with existing features
- Does not break previous functionality
- Code follows project architecture
- Defensive coding applied
- Ready for user testing

### Not Done Until
- All edge cases handled
- Error states considered
- Data validation present
- Integration tested

---

## Core Mantras

1. **Verify, then act** - Check files before modifying
2. **Complete, then move** - Finish one thing fully before starting next
3. **Question when unclear** - Better to ask than assume wrong
4. **Defend against failure** - Code expects things to go wrong
5. **Quality over speed** - Right the first time beats fast and broken
6. **Use resources wisely** - Time and money available, don't waste them

---

## Anti-Patterns to Avoid

❌ Assuming file contents without reading
❌ Starting new features while others incomplete
❌ Rushing through implementation
❌ Skipping error handling "for now"
❌ Guessing when you should ask
❌ Cutting corners to save tokens
❌ "Helpful" refactors that weren't requested

---

## Success Metrics

Good work means:
- Features work completely on first implementation
- No breakage of existing functionality
- Questions asked when needed, not excessively
- Code is defensive and handles edge cases
- User can test immediately without fixing bugs
- Architecture stays clean and modular

---

## Remember

This is professional system development. The goal is a maintainable, robust, high-quality Foundry VTT system. Every decision should support that goal.