# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - button "Back to Home" [ref=e3]:
      - img [ref=e4]
      - generic [ref=e7]: Back to Home
    - generic [ref=e8]:
      - generic [ref=e10]:
        - generic [ref=e12]: A
        - generic [ref=e13]: ATLAS
      - generic [ref=e14]:
        - generic [ref=e15]:
          - heading "Welcome Back" [level=1] [ref=e16]
          - paragraph [ref=e17]: Sign in to continue your learning journey
        - generic [ref=e18]:
          - generic [ref=e19]:
            - generic [ref=e20]: Email Address
            - textbox "Email Address" [ref=e21]:
              - /placeholder: you@example.com
          - generic [ref=e22]:
            - generic [ref=e23]: Password
            - generic [ref=e24]:
              - textbox "Password" [ref=e25]:
                - /placeholder: Enter your password
              - button [ref=e26]:
                - img [ref=e27]
          - button "Sign In" [ref=e30]:
            - img [ref=e31]
            - generic [ref=e35]: Sign In
      - paragraph [ref=e36]: Need an account? Contact your program administrator.
  - region "Notifications alt+T"
  - alert [ref=e37]
```