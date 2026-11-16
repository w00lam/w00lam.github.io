(function () {
  'use strict';

  const roots = document.querySelectorAll('[data-interactive-flow]');

  roots.forEach((root) => {
    if (root.dataset.flowInitialized === 'true') {
      return;
    }

    try {
      const actorElements = [...root.querySelectorAll('[data-actor]')];
      const stepElements = [...root.querySelectorAll('[data-flow-step-data] > li')];
      const controls = {
        previous: root.querySelector('[data-flow-action="previous"]'),
        reset: root.querySelector('[data-flow-action="reset"]'),
        next: root.querySelector('[data-flow-action="next"]')
      };
      const refs = {
        title: root.querySelector('[data-flow-step-title]'),
        count: root.querySelector('[data-flow-step-count]'),
        from: root.querySelector('[data-flow-from]'),
        to: root.querySelector('[data-flow-to]'),
        routeLabel: root.querySelector('[data-flow-route-label]'),
        payload: root.querySelector('[data-flow-payload]'),
        outcomes: root.querySelector('[data-flow-outcomes]'),
        description: root.querySelector('[data-flow-description]'),
        error: root.querySelector('[data-flow-error]'),
        stepData: root.querySelector('[data-flow-step-data]')
      };

      if (
        actorElements.length === 0 ||
        stepElements.length === 0 ||
        Object.values(controls).some((control) => !control) ||
        Object.values(refs).some((ref) => !ref)
      ) {
        throw new Error('Interactive flow markup is incomplete.');
      }

      const steps = stepElements.map((element) => ({
        title: element.querySelector('[data-step-title]').textContent.trim(),
        description: element.querySelector('[data-step-description]').textContent.trim(),
        from: element.dataset.flowFrom,
        to: element.dataset.flowTo,
        routeLabel: element.dataset.flowRouteLabel,
        activeActors: element.dataset.activeActors.split(',').map((actor) => actor.trim()),
        payload: [...element.querySelectorAll('[data-step-payload] li')].map((item) =>
          item.textContent.trim()
        ),
        outcomes: [...element.querySelectorAll('[data-step-outcomes] li')].map((item) => ({
          status: item.dataset.outcomeStatus || 'info',
          text: item.textContent.trim()
        }))
      }));

      let currentStep = 0;

      const createTextElement = (tagName, className, text) => {
        const element = document.createElement(tagName);
        element.className = className;
        element.textContent = text;
        return element;
      };

      const renderPayload = (payload) => {
        refs.payload.replaceChildren(
          ...payload.map((item) => createTextElement('li', 'interactive-flow__payload-item', item))
        );
      };

      const renderOutcomes = (outcomes) => {
        const statusLabels = {
          allow: '처리',
          reject: '거부',
          warning: '주의',
          info: '참고'
        };

        refs.outcomes.replaceChildren(
          ...outcomes.map((outcome) => {
            const item = document.createElement('div');
            item.className = `interactive-flow__outcome is-${outcome.status}`;
            item.append(
              createTextElement(
                'span',
                'interactive-flow__outcome-status',
                statusLabels[outcome.status] || statusLabels.info
              ),
              createTextElement('span', 'interactive-flow__outcome-text', outcome.text)
            );
            return item;
          })
        );
      };

      const renderActors = (activeActors) => {
        const activeActorSet = new Set(activeActors);

        actorElements.forEach((actor) => {
          const isActive = activeActorSet.has(actor.dataset.actor);
          actor.dataset.state = isActive ? 'active' : 'idle';
          actor.querySelector('[data-actor-state]').textContent = isActive ? '현재 단계' : '대기';
        });
      };

      const render = () => {
        const step = steps[currentStep];

        root.dataset.step = String(currentStep + 1);
        refs.title.textContent = step.title;
        refs.count.textContent = `${currentStep + 1} / ${steps.length}`;
        refs.from.textContent = step.from;
        refs.to.textContent = step.to;
        refs.routeLabel.textContent = step.routeLabel;
        refs.description.textContent = step.description;
        controls.previous.disabled = currentStep === 0;
        controls.reset.disabled = currentStep === 0;
        controls.next.disabled = currentStep === steps.length - 1;
        refs.stepData.hidden = true;

        renderActors(step.activeActors);
        renderPayload(step.payload);
        renderOutcomes(step.outcomes);
      };

      const moveTo = (stepIndex) => {
        currentStep = Math.min(Math.max(stepIndex, 0), steps.length - 1);
        render();
      };

      controls.previous.addEventListener('click', () => moveTo(currentStep - 1));
      controls.reset.addEventListener('click', () => moveTo(0));
      controls.next.addEventListener('click', () => moveTo(currentStep + 1));

      root.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          moveTo(currentStep - 1);
        }

        if (event.key === 'ArrowRight') {
          event.preventDefault();
          moveTo(currentStep + 1);
        }

        if (event.key === 'Home') {
          event.preventDefault();
          moveTo(0);
        }

        if (event.key === 'End') {
          event.preventDefault();
          moveTo(steps.length - 1);
        }
      });

      root.dataset.flowInitialized = 'true';
      render();
      root.classList.add('is-ready');
    } catch (error) {
      const errorMessage = root.querySelector('[data-flow-error]');
      const stepData = root.querySelector('[data-flow-step-data]');
      const actionButtons = root.querySelectorAll('[data-flow-action]');

      root.classList.add('is-failed');
      actionButtons.forEach((button) => {
        button.disabled = true;
      });
      if (errorMessage) {
        errorMessage.hidden = false;
      }
      if (stepData) {
        stepData.hidden = false;
      }
      console.error('Interactive flow initialization failed.', error);
    }
  });
})();
