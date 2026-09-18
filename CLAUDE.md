# CLAUDE.md

## General Rules

Follow these rules for every task in this project.

### 1. Plan Before Execution

Always start by making a clear implementation plan before doing any work.

The plan should:

* Identify what needs to be done.
* Identify the files or parts of the project that may be affected.
* Determine which skills or plugins are actually needed.
* Keep the plan simple and focused on the user's objective.
* Avoid adding extra steps, systems, layers, or features that are not required.
* Prefer the simplest approach that can correctly solve the task.

Do not start making changes before understanding the task.

### 2. Do Not Over-Engineer the Plan or Implementation

Both the planning and implementation must stay simple, focused, and appropriate for the actual task.

Do not:

* Add unnecessary architecture.
* Add extra abstractions without a clear need.
* Create additional layers when a direct solution is enough.
* Add features the user did not request.
* Introduce complex patterns for simple problems.
* Rewrite large parts of the project when a small change can solve the issue.
* Add new libraries or tools when the existing project can already handle the task.
* Prepare for unlikely future requirements unless the user specifically asks for them.

Always prefer:

* Simple solutions.
* Small and focused changes.
* Existing project patterns.
* Reusable code only when reuse is actually needed.
* Easy-to-understand implementation.
* The minimum amount of work needed to correctly complete the objective.

The implementation plan should not make the task larger than necessary.

The final implementation should follow the same level of simplicity described in the plan.

### 3. Create Visual Plans After the Implementation Plan

After the implementation plan has been created, always use the `plan-visuals` skill when it is available and relevant.

Use it to create a visual version of the implementation plan.

Store all generated visual plans inside:

`docs/visual-plans`

Rules:

* Create the `docs/visual-plans` folder if it does not exist.
* Keep visual plans related to the current implementation inside this folder.
* Use clear file names that describe the task or feature.
* Do not place visual planning files in unrelated folders.
* The visual plan should match the implementation plan.
* The visual plan must not introduce extra features, unnecessary systems, or additional complexity.
* Keep the visual plan simple and focused only on what needs to be implemented.

The expected planning flow is:

1. Understand the user's objective.
2. Create a simple implementation plan.
3. Check that the plan is not over-engineered.
4. Use the `plan-visuals` skill.
5. Store the visual plan in `docs/visual-plans`.
6. Begin implementation.
7. Keep the implementation as simple as the approved plan.

### 4. Do Not Commit Automatically

Never create a Git commit unless the user clearly asks you to commit.

You may:

* Create files.
* Edit files.
* Delete files when required.
* Run tests.
* Check Git status.
* Review changes.

But do not run a commit command unless the user gives permission or directly asks for it.

### 5. Do Not Add Authors to Commits

When creating a commit after the user gives permission:

* Do not add `Co-Authored-By`.
* Do not add Claude as an author.
* Do not add AI-related authors.
* Do not add extra author information.
* Do not change the user's existing Git identity.

Use only the normal commit message requested or approved by the user.

### 6. Use Plain Language

Always communicate using simple and clear words.

Avoid:

* Unnecessary jargon.
* Complicated technical terms when simpler words can explain the same thing.
* Overly formal wording.
* Long explanations when a short explanation is enough.

If a technical term is necessary, explain it using simple words.

### 7. Use Only Relevant Skills

Use installed skills only when they are useful for the current objective.

Before using a skill:

* Check whether it directly helps with the task.
* Avoid loading unrelated skills.
* Prefer the smallest number of skills needed to complete the work.
* Do not use a skill just because it is available.

The task objective should determine which skills are used.

If an implementation plan has been created, use the `plan-visuals` skill as described above.

### 8. Use Installed Plugins When Needed

Use installed plugins when they can directly help complete the user's request.

Plugins should only be used when:

* They provide information needed for the task.
* They provide access to a service required by the task.
* They make the task more accurate or complete.
* The user specifically asks to use them.

Do not use unrelated plugins.

### 9. Follow the User's Instructions

The user's current request is the main objective.

When working:

* Follow the user's requirements closely.
* Do not add unnecessary features.
* Do not change unrelated parts of the project.
* Do not make assumptions when the project already provides the answer.
* Keep changes focused on the requested task.

If the user gives a new instruction that changes the current task, follow the latest instruction.

### 10. Keep Changes Focused

Only modify files that are necessary for the task.

Before changing an existing file:

* Understand what it currently does.
* Keep existing working behavior unless the task requires changing it.
* Avoid rewriting large parts of the project when a smaller change will work.
* Use the project's existing structure when possible.
* Avoid introducing new patterns unless the current structure cannot handle the task cleanly.

Do not perform unrelated cleanup or restructuring unless the user asks for it.

### 11. Check Work Before Finishing

Before saying the task is complete:

* Review the changes.
* Check for obvious mistakes.
* Run relevant tests or checks when available.
* Make sure the result matches the user's request.
* Confirm that unnecessary complexity was not introduced.
* Clearly mention any part that could not be checked.

Never claim something works if it was not checked when checking it was possible.