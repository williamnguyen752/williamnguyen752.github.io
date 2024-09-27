## Projects

### SpamOverflow
Developed a scalable email filtering service using a microservices architecture on AWS, capable of processing up to 10,000 emails per minute.

- Implemented infrastructure as code using **Terraform**, enabling consistent and repeatable deployments across multiple AWS regions.
- Utilized **AWS S3** for storing and retrieving email data, processing over 1TB of email content daily with 99.99% durability.
- Designed and implemented a **PostgreSQL** database on **Amazon RDS**, optimizing query performance to handle 5000+ writes per second.
- Developed RESTful API endpoints using **Node.js** and **Express.js**, achieving 99.8% uptime and an average response time of 200ms.
- Leveraged **AWS Lambda** for serverless email processing, reducing operational costs by 40% compared to traditional EC2 instances.
- Implemented **Amazon CloudWatch** for real-time monitoring and alerting, reducing mean time to resolution for incidents by 60%.
- Utilized **AWS ECS** with **Docker** for containerized microservices, improving scalability and reducing deployment time from hours to minutes.
- Integrated **AWS SQS** for asynchronous processing, ensuring zero message loss during traffic spikes of up to 20,000 requests per minute.

**Technologies:** AWS (S3, RDS, Lambda, CloudWatch, ECS), Terraform, PostgreSQL, Node.js, Express.js, Docker, SQS, Microservices, REST API

### ScanOrderQR
Built a full-stack web application for QR code-based ordering systems, streamlining the ordering process for restaurants and improving customer experience.

- Developed the backend using **PHP** and **Laravel framework**, handling an average of 1000 orders per hour during peak times.
- Implemented a **MySQL** database to manage order data, customer information, and inventory, optimizing queries to reduce average response time by 40%.
- Created a responsive frontend using **Vue.js** and **Tailwind CSS**, improving mobile order completion rate by 25%.
- Integrated **Stripe API** for secure payment processing, handling transactions worth $50,000+ monthly with 99.9% success rate.
- Implemented real-time order notifications using **WebSockets**, reducing order preparation time by 30%.
- Utilized **Redis** for caching frequently accessed data, improving overall application performance by 50%.
- Implemented **Docker** containers for development and production environments, ensuring consistency across different deployment stages.
- Set up a **CI/CD pipeline** using **GitLab CI**, reducing deployment time from 1 hour to 10 minutes and eliminating 95% of deployment-related issues.
- Integrated **Google Analytics** for user behavior tracking, leading to UI/UX improvements that increased customer retention by 20%.

**Technologies:** PHP, Laravel, MySQL, Vue.js, Tailwind CSS, WebSockets, Redis, Docker, GitLab CI, Stripe API, Google Analytics