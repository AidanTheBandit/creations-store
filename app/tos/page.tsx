import { Section, Container } from "@/components/craft";
import Link from "next/link";

export default function TOSPage() {
  return (
    <Section>
      <Container>
        <div className="mx-auto max-w-4xl space-y-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
            <p className="mt-2 text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="space-y-6 prose prose-gray max-w-none dark:prose-invert">
            <section>
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing or using this service ("Directory"), you agree to be bound by these Terms of Service.
                If you do not agree to these terms, please do not use our service.
              </p>
            </section>

            <section>
              <h2>2. User Responsibilities</h2>
              <p>As a user of this service, you agree to:</p>
              <ul>
                <li>Submit only accurate and truthful information</li>
                <li>Not submit content that is illegal, harmful, threatening, abusive, or defamatory</li>
                <li>Not submit content that violates the intellectual property rights of others</li>
                <li>Not attempt to circumvent any technical measures we use to protect the service</li>
                <li>Not use the service for any unlawful purpose</li>
              </ul>
            </section>

            <section>
              <h2>3. Content Guidelines</h2>
              <p>
                Users may submit creations (applications, tools, resources) to the directory. All submissions must:
              </p>
              <ul>
                <li>Be appropriate for all audiences</li>
                <li>Not contain malware, viruses, or harmful code</li>
                <li>Not promote hate speech, violence, or discrimination</li>
                <li>Respect the intellectual property rights of others</li>
                <li>Provide accurate descriptions and metadata</li>
              </ul>
            </section>

            <section>
              <h2>4. Prohibited Activities</h2>
              <p>The following activities are strictly prohibited:</p>
              <ul>
                <li>Submitting spam or irrelevant content</li>
                <li>Impersonating others or misrepresenting your identity</li>
                <li>Attempting to gain unauthorized access to our systems</li>
                <li>Interfering with the proper functioning of the service</li>
                <li>Harassing or abusing other users</li>
              </ul>
            </section>

            <section>
              <h2>5. Enforcement and Suspension</h2>
              <p>
                We reserve the right to suspend or terminate user accounts that violate these Terms of Service.
                Suspended users will have their content hidden from the directory and will not be able to access their account.
              </p>
              <p>
                Violations may result in:
              </p>
              <ul>
                <li>Temporary suspension of account privileges</li>
                <li>Permanent removal of content</li>
                <li>Permanent account termination</li>
              </ul>
            </section>

            <section>
              <h2>6. Intellectual Property</h2>
              <p>
                Users retain ownership of the content they submit. By submitting content, you grant us a license to display,
                distribute, and promote your content within the service.
              </p>
              <p>
                You represent and warrant that you have the right to submit all content and that it does not infringe
                upon the rights of any third party.
              </p>
            </section>

            <section>
              <h2>7. Disclaimer of Warranties</h2>
              <p>
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
                EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY,
                FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
            </section>

            <section>
              <h2>8. Limitation of Liability</h2>
              <p>
                We shall not be liable for any indirect, incidental, special, consequential, or punitive damages
                resulting from your use of the service.
              </p>
            </section>

            <section>
              <h2>9. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. Continued use of the service after
                changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2>10. Contact Information</h2>
              <p>
                If you have questions about these Terms of Service, please contact us through our platform.
              </p>
            </section>
          </div>

          <div className="pt-6 border-t">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
}
