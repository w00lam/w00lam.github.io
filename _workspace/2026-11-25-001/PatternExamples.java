import java.util.ArrayList;
import java.util.List;

public final class PatternExamples {

    public static void main(String[] args) {
        System.out.println("== Template Method ==");
        new FileProcessor().process();
        new ApiProcessor().process();

        System.out.println("== Factory Method ==");
        NotificationCreator emailCreator = new EmailCreator();
        emailCreator.send("hello");
        NotificationCreator smsCreator = new SmsCreator();
        smsCreator.send("hello");

        System.out.println("== Observer ==");
        OrderSubject order = new OrderSubject();
        EmailObserver emailObserver = new EmailObserver();
        SmsObserver smsObserver = new SmsObserver();

        order.register(emailObserver);
        order.register(smsObserver);
        order.setStatus("PAID");
        order.unregister(smsObserver);
        order.setStatus("CANCELLED");
    }

    abstract static class AbstractProcessor {

        public final void process() {
            initialize();
            load();
            transform();
            if (shouldValidate()) {
                validate();
            }
            finish();
        }

        protected void initialize() {
            System.out.println("initialize");
        }

        protected abstract void load();

        protected abstract void transform();

        protected boolean shouldValidate() {
            return true;
        }

        protected void validate() {
            System.out.println("validate");
        }

        protected void finish() {
            System.out.println("finish");
        }
    }

    static final class FileProcessor extends AbstractProcessor {

        @Override
        protected void load() {
            System.out.println("load file");
        }

        @Override
        protected void transform() {
            System.out.println("transform file");
        }
    }

    static final class ApiProcessor extends AbstractProcessor {

        @Override
        protected void load() {
            System.out.println("load API response");
        }

        @Override
        protected void transform() {
            System.out.println("transform API response");
        }

        @Override
        protected boolean shouldValidate() {
            return false;
        }
    }

    interface Notification {
        void notify(String message);
    }

    static final class EmailNotification implements Notification {

        @Override
        public void notify(String message) {
            System.out.println("Email: " + message);
        }
    }

    static final class SmsNotification implements Notification {

        @Override
        public void notify(String message) {
            System.out.println("SMS: " + message);
        }
    }

    abstract static class NotificationCreator {

        public final void send(String message) {
            Notification notification = createNotification();
            notification.notify(message);
        }

        protected abstract Notification createNotification();
    }

    static final class EmailCreator extends NotificationCreator {

        @Override
        protected Notification createNotification() {
            return new EmailNotification();
        }
    }

    static final class SmsCreator extends NotificationCreator {

        @Override
        protected Notification createNotification() {
            return new SmsNotification();
        }
    }

    interface Subject {
        void register(Observer observer);

        void unregister(Observer observer);

        void notifyObservers();
    }

    interface Observer {
        void update(String status);
    }

    static final class OrderSubject implements Subject {
        private final List<Observer> observers = new ArrayList<>();
        private String status = "CREATED";

        @Override
        public void register(Observer observer) {
            observers.add(observer);
        }

        @Override
        public void unregister(Observer observer) {
            observers.remove(observer);
        }

        @Override
        public void notifyObservers() {
            for (Observer observer : List.copyOf(observers)) {
                observer.update(status);
            }
        }

        public void setStatus(String status) {
            this.status = status;
            notifyObservers();
        }
    }

    static final class EmailObserver implements Observer {

        @Override
        public void update(String status) {
            System.out.println("Email: " + status);
        }
    }

    static final class SmsObserver implements Observer {

        @Override
        public void update(String status) {
            System.out.println("SMS: " + status);
        }
    }
}
