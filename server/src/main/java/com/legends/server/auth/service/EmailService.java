package com.legends.server.auth.service;

import com.legends.server.exception.custom.EmailDeliveryException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String sender;

    @Value("${app.email.verification-expiration-minutes}")
    private long expirationMinutes;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendVerificationEmail(String recipient, String rawCode) {
        String template = loadTemplate("templates/email-verification.html");
        String content = fillCode(template.replace("{{VERIFICATION_CODE}}", rawCode), rawCode);
        MimeMessage message = mailSender.createMimeMessage();

        try {
            MimeMessageHelper helper = new MimeMessageHelper(message, MimeMessageHelper.MULTIPART_MODE_RELATED, "UTF-8");
            helper.setFrom(sender);
            helper.setTo(recipient);
            helper.setSubject(rawCode + " is your CaTch code");
            helper.setText(content, true);
            addBrandImages(helper);

            mailSender.send(message);
        } catch (MessagingException | MailException ex) {
            throw new EmailDeliveryException("Unable to send verification email", ex);
        }
    }

    public void sendPasswordResetEmail(String recipient, String rawCode) {

        String template = loadTemplate("templates/password-reset.html");
        String content = fillCode(template.replace("{{PASSWORD_RESET_CODE}}", rawCode), rawCode);
        MimeMessage message = mailSender.createMimeMessage();

        try {
            MimeMessageHelper helper = new MimeMessageHelper(message, MimeMessageHelper.MULTIPART_MODE_RELATED, StandardCharsets.UTF_8.name());
            helper.setFrom(sender);
            helper.setTo(recipient);
            helper.setSubject(rawCode + " is your CaTch password reset code");
            helper.setText(content, true);
            addBrandImages(helper);

            mailSender.send(message);
        } catch (MessagingException | MailException exception) {
            throw new EmailDeliveryException("Unable to send password reset email", exception);
        }
    }

    public void sendFallAlertEmail(String recipient, String deviceId, double probability, java.time.Instant detectedAt) {
        MimeMessage message = mailSender.createMimeMessage();
        int probabilityPercent = (int) Math.round(probability * 100);

        try {
            MimeMessageHelper helper = new MimeMessageHelper(message, MimeMessageHelper.MULTIPART_MODE_RELATED, StandardCharsets.UTF_8.name());
            helper.setFrom(sender);
            helper.setTo(recipient);
            helper.setSubject("Possible fall detected for " + deviceId);
            helper.setText("""
                    <h2>Possible fall detected</h2>
                    <p>CaTch detected a possible fall for device <strong>%s</strong>.</p>
                    <p>Probability: <strong>%d%%</strong></p>
                    <p>Detected at: %s</p>
                    <p>Please open the CaTch application and check the person.</p>
                    """.formatted(deviceId, probabilityPercent, detectedAt), true);
            mailSender.send(message);
        } catch (MessagingException | MailException exception) {
            throw new EmailDeliveryException("Unable to send fall alert email", exception);
        }
    }

    private String fillCode(String template, String rawCode) {
        String content = template.replace("{{EXPIRATION_MINUTES}}", String.valueOf(expirationMinutes));

        for (int i = 0; i < rawCode.length(); i++) {
            content = content.replace("{{CODE_DIGIT_" + (i + 1) + "}}", String.valueOf(rawCode.charAt(i)));
        }

        return content;
    }

    private void addBrandImages(MimeMessageHelper helper) throws MessagingException {
        helper.addInline("catch-logo", "email-logo.png", new ClassPathResource("templates/images/email-logo.png"), "image/png");
        helper.addInline("clock-icon", "email-clock.png", new ClassPathResource("templates/images/email-clock.png"), "image/png");
    }

    private String loadTemplate(String path) {
        try {
            ClassPathResource resource = new ClassPathResource(path);
            String result = new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);

            return result;
        } catch (IOException ex) {
            throw new EmailDeliveryException("Unable to load email template", ex);
        }
    }
}