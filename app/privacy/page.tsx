import { Section, Container } from "@/components/craft";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <Section>
      <Container>
        <div className="mx-auto max-w-4xl space-y-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
            <p className="mt-2 text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="space-y-6 prose prose-gray max-w-none dark:prose-invert">
            <section>
              <h2>1. Information We Collect</h2>
              <p>We collect information you provide directly to us, including:</p>
              <ul>
                <li><strong>Account Information:</strong> Name, email address, username, and profile picture (if provided)</li>
                <li><strong>Content:</strong> Creations you submit to the directory, including titles, descriptions, and metadata</li>
                <li><strong>Usage Data:</strong> IP address, browser type, and viewing statistics for content engagement</li>
                <li><strong>Authentication Data:</strong> Session tokens and OAuth credentials (if you sign in with Discord)</li>
              </ul>
            </section>

            <section>
              <h2>2. How We Use Your Information</h2>
              <p>We use the collected information for various purposes, including:</p>
              <ul>
                <li>Providing and maintaining the service</li>
                <li>Displaying your submissions in the directory</li>
                <li>Tracking view counts and engagement metrics</li>
                <li>Communicating with you about service updates</li>
                <li>Enforcing our Terms of Service</li>
                <li>Detecting, preventing, and addressing technical issues and fraudulent activity</li>
              </ul>
            </section>

            <section>
              <h2>3. Information Sharing</h2>
              <p>We do not sell your personal information. We may share your information only in the following circumstances:</p>
              <ul>
                <li><strong>Service Providers:</strong> With trusted third parties who assist us in operating the service</li>
                <li><strong>Legal Requirements:</strong> If required to do so by law or in response to valid legal requests</li>
                <li><strong>Protection of Rights:</strong> To protect our rights, property, or safety, or that of our users</li>
                <li><strong>Public Content:</strong> Information you choose to publish in the directory is publicly accessible</li>
              </ul>
            </section>

            <section>
              <h2>4. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information
                against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission
                over the internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2>2. Data Retention</h2>
              <p>
                We retain your personal information for as long as necessary to provide the service and fulfill the
                purposes outlined in this privacy policy. You may request deletion of your account and associated
                data at any time.
              </p>
            </section>

            <section>
              <h2>6. Your Rights and Choices</h2>
              <p>You have certain rights regarding your personal information:</p>
              <ul>
                <li><strong>Access:</strong> Request access to your personal data</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                <li><strong>Objection:</strong> Object to processing of your personal data</li>
                <li><strong>Export:</strong> Request a copy of your data in a portable format</li>
              </ul>
              <p>
                To exercise these rights, please contact us through our platform or submit a request through your account settings.
              </p>
            </section>

            <section>
              <h2>7. Cookies and Tracking</h2>
              <p>
                We use cookies and similar tracking technologies to track activity on our service and hold certain information.
                Cookies are files with small amount of data which may include an anonymous unique identifier.
              </p>
              <p>You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.</p>
            </section>

            <section>
              <h2>8. Third-Party Services</h2>
              <p>
                Our service may contain links to third-party websites or integrate with third-party services (such as Discord for authentication).
                These third parties have their own privacy policies, and we are not responsible for their practices.
              </p>
            </section>

            <section>
              <h2>9. Children's Privacy</h2>
              <p>
                Our service is not intended for children under the age of 13. We do not knowingly collect personal
                information from children under 13. If you are a parent or guardian and believe your child has
                provided us with personal information, please contact us.
              </p>
            </section>

            <section>
              <h2>10. Changes to This Privacy Policy</h2>
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting
                the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2>11. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us through our platform.
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
